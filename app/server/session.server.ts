import { Request } from "remix"
import { redirect, createCookieSessionStorage } from "remix"
import jwt from "jsonwebtoken"

import { User } from "../models/user"
import { repository } from "../repositories/users.server"

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET
const PROTOCOL = process.env.PROTOCOL || (process.env.NODE_NEV !== "production" ? "http://" : "https://")
const JWT_ISSUER = process.env.JWT_ISSUER || "urn:renodes:issuer"
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "urn:renodes:audience"

const sessionIdKey = "__session_id__"
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 30

if (
  !GITHUB_CLIENT_ID ||
  !GITHUB_CLIENT_SECRET ||
  !SESSION_SECRET
) throw new Error("missing required environment variables")
/**
 * sessionStorage is a SessionStorage insance used to hold the information
 * about the signed in users.
 */
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "ReNodes_root_session",
    secrets: [SESSION_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: sessionExpirationTime,
  }
})
/**
 * authorize triggers a redirect to the GitHub authorize page so the
 * users can sign in using their GitHub accounts.
 * @param request - Fetch API Request object.
 */
async function authorize(request: Request) {
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", GITHUB_CLIENT_ID)
  url.searchParams.set("redirect_uri", PROTOCOL + request.headers.get("Host") + "/auth/callback")
  return redirect(url.href)
}
/**
 * callback is the function that must be called by the sign in providers
 * after a user tries to sign in to the platform.
 * @param request - Fetch API Request object.
 */
async function callback(request: Request) {
  try {
    const query = new URLSearchParams(request.url.split("?")[1])
    const code = query.get("code")
    //const state = query.get("state")
    const tokensBody = new URLSearchParams()
    tokensBody.set("client_id", GITHUB_CLIENT_ID)
    tokensBody.set("client_secret", GITHUB_CLIENT_SECRET)
    tokensBody.set("code", code)
    tokensBody.set("redirect_uri", PROTOCOL + request.headers.get("Host") + "/auth/callback")
    const accessTokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: tokensBody.toString(),
    })
    const tokens = await accessTokenResponse.json()
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${tokens.access_token}`,
        "Accept": "application/json",
      }
    })
    const json = await userResponse.json()
    await repository.put(new User({
      id: json.id,
      email: json.email,
      provider: "github",
      username: json.login,
      avatarURL: json.avatar_url,
      location: json.location,
      name: json.name,
    }))
    const token = jwt.sign({
      sub: `${json.id}.github`,
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
    }, SESSION_SECRET)
    const session = await getSession(request)
    session.unset(sessionIdKey)
    session.set(sessionIdKey, token)
    return redirect("/home", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
    })
  } catch (err) {
    console.error(err)
    return redirect("/home")
  }
}
/**
 * getSession is a helper function that extracts a Session instance from
 * the request Cookies header.
 * @param request - Fetch API Request object.
 */
async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"))
}
/**
 * getUserFromSession returns a User model extracted from the request
 * headers or an error if none can be found.
 * @param request - Fetch API Request object.
 */
async function getUserFromSession(request: Request): Promise<User | undefined> {
  try {
    const session = await getSession(request)
    const sessionId = session.get(sessionIdKey) as string | undefined
    if (!sessionId) {
      console.error("failure getting the user from session ID")
      return undefined
    }
    const user = await repository.get(sessionId)
    return user
  } catch (err) {
    console.error(err)
    return undefined
  }
}
/**
 * hasValidSession checks if the request contains a valid JWT token stored
 * as a Session.
 * @param request - Fetch API Request object.
 */
async function hasValidSession(request: Request): Promise<boolean> {
  try {
    const session = await getSession(request)
    const token = session.get(sessionIdKey) as string | undefined
    if (!token) return false
    const decoded = jwt.verify(token, SESSION_SECRET, {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    })
    return true
  } catch (err) {
    console.error(err)
    return undefined
  }
}
/**
 * Exports
 */
export {
  getSession,
  getUserFromSession,
  authorize,
  callback,
  hasValidSession,
}