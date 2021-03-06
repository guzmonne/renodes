import { Request } from "remix"
import { redirect, createCookieSessionStorage } from "remix"
import jwt from "jsonwebtoken"

import { User } from "../models/user"
import { repository } from "../repositories/users.server"
import { InvalidSubClaimError, UndefinedTokenError } from "./errors.server"

export interface JWTToken extends jwt.JwtPayload {
  sub: string;
  exp: number;
  iss: string;
  aud: string;
  iat: number;
}
/**
 * Constants
 */
/**
 * GITHUB_CLIENT_ID should correspond to the app client ID from
 * GitHub to support OIDC authentication.
 */
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
/**
 * GITHUB_CLIENT_SECRET is the secret configured on the GitHub
 * app to support OIDC authentication.
 */
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
/**
 * SESSION_SECRET will be the secret used to encript the cookies
 * and JWT tokens.
 */
const SESSION_SECRET = process.env.SESSION_SECRET
/**
 * PROTOCOL should match the protocol used to run the App. It can
 * only be set to `http://` or `https://`.
 */
const PROTOCOL = process.env.PROTOCOL || (process.env.NODE_NEV !== "production" ? "http://" : "https://")
/**
 * JWT_ISSUER is the string used to fill and check the JWT `iss` claim.
 */
const JWT_ISSUER = process.env.JWT_ISSUER || "urn:renodes:issuer"
/**
 * JWT_AUDIENCE is the string used to fill and check the JWT `aud` claim.
 */
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "urn:renodes:audience"
/**
 * SESSION_ID_KEY is the name of the key to be used to hold the session
 * id inside a Cookie.
 */
const SESSION_ID_KEY = process.env.SESSION_ID_KEY || "__session_id__"
/**
 * SESSION_EXPIRATION_TIME represent the expiration time of both the
 * cookies and JWT tokens.
 */
const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
/**
 * ONE_HOUR_IN_SECONDS is the representation of an hour counted is seconds.
 */
const ONE_HOUR_IN_SECONDS = 60 * 60
/**
 * Setup
 */
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
    maxAge: SESSION_EXPIRATION_TIME,
  }
})
/**
 * signIn starts the flow necessary to authenticate a user.
 * @param request - Fetch API Request object.
 * @param originURI - URI where the flow originates from.
 */
async function signIn(request: Request, originURI: string = "/home") {
  const signInURL = new URL(request.url)
  originURI = signInURL.searchParams.get("origin_uri") || originURI
  await getSession(request)
  return authorize(request, originURI)
}
/**
 * authorize triggers a redirect to the GitHub authorize page so the
 * users can sign in using their GitHub accounts.
 * @param request - Fetch API Request object.
 * @param originURI - URI where the flow originates from.
 */
async function authorize(request: Request, originURI: string) {
  const redirectURL = new URL(PROTOCOL + request.headers.get("Host") + "/auth/callback")
  redirectURL.searchParams.set("origin_uri", originURI)
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", GITHUB_CLIENT_ID)
  url.searchParams.set("redirect_uri", redirectURL.href)
  return redirect(url.href)
}
/**
 * callback is the function that must be called by the sign in providers
 * after a user tries to sign in to the platform.
 * @param request - Fetch API Request object.
 */
async function callback(request: Request) {
  const callbackURL = new URL(request.url)
  const code = callbackURL.searchParams.get("code")
  const originURL = callbackURL.searchParams.get("origin_uri") || "/home"
  //const state = query.get("state")
  try {
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
      exp: Math.floor(Date.now() / 1000) + ONE_HOUR_IN_SECONDS,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
    }, SESSION_SECRET)
    const session = await getSession(request)
    session.set(SESSION_ID_KEY, token)
    return redirect(originURL, {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
    })
  } catch (err) {
    console.error(err)
    return redirect(originURL)
  }
}
/**
 * signOut deletes the session of a user.
 * @param request - Fetch API Request object.
 */
async function signOut(request: Request) {
  const signOutURL = new URL(request.url)
  const originURL = signOutURL.searchParams.get("origin_uri") || "/home"
  const session = await unsetSessionId(request)
  return redirect(originURL, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
  })
}
/**
 * getSession is a helper function that extracts a Session instance from
 * the request Cookies header.
 * @param request - Fetch API Request object.
 */
async function getSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"))
  return session
}
/**
 * getSessionId returns the token stored on the session.
 * @param request - Fetch API Request object.
 */
async function getSessionId(request: Request) {
  const session = await getSession(request)
  return session.get(SESSION_ID_KEY) as string | undefined
}
/**
 * unsetSessionId unsets the current session.
 * @param request - Fetch API Request object.
 */
async function unsetSessionId(request: Request) {
  const session = await getSession(request)
  session.unset(SESSION_ID_KEY)
  return session
}
/**
 * getUserFromSession returns a User model extracted from the request
 * headers or an error if none can be found.
 * @param request - Fetch API Request object.
 */
async function getUserFromSession(request: Request): Promise<User> {
  try {
    const token = await getDecodedToken(request)
    const [id, provider] = token.sub.split(".")
    if (!id || !provider) throw new InvalidSubClaimError()
    const user = await repository.get(id)
    return user
  } catch (err) {
    await unsetSessionId(request)
    throw err
  }
}
/**
 * getDecodedToken returns a decoded JWT token stored as a Cookie inside
 * a request.
 * @param request - Fetch API Request object.
 */
async function getDecodedToken(request: Request): Promise<JWTToken> {
  const token = await getSessionId(request)
  if (!token) throw new UndefinedTokenError()
  const decoded = jwt.verify(token, SESSION_SECRET, {
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  }) as JWTToken
  return decoded
}
/**
 * hasValidSession checks if the request contains a valid JWT token stored
 * as a Session.
 * @param request - Fetch API Request object.
 */
async function hasValidSession(request: Request): Promise<boolean> {
  try {
    return !!getDecodedToken(request)
  } catch (err) {
    console.error(err)
    return undefined
  }
}
/**
 * Exports
 */
export {
  authorize,
  callback,
  getSession,
  getUserFromSession,
  hasValidSession,
  signIn,
  signOut,
}