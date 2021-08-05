import { Request } from "remix"
import { redirect, createCookieSessionStorage } from "remix"

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET
const PROTOCOL = process.env.PROTOCOL || (process.env.NODE_NEV !== "production" ? "http://" : "https://")

const sessionIdKey = "__session_id__"
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 30

const DB: { [key: string]: any } = {}

if (
  !GITHUB_CLIENT_ID ||
  !GITHUB_CLIENT_SECRET ||
  !SESSION_SECRET
) throw new Error("missing required environment variables")

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "ReNodes_root_session",
    secrets: [SESSION_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: sessionExpirationTime,
  }
})

async function authorize(request: Request) {
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", GITHUB_CLIENT_ID)
  url.searchParams.set("redirect_uri", PROTOCOL + request.headers.get("Host") + "/auth/callback")
  return redirect(url.href)
}

async function callback(request: Request) {
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
  const user = await userResponse.json()
  DB[user.id] = user
  console.log({ DB, user })
  const session = await getSession(request)
  session.unset(sessionIdKey)
  session.set(sessionIdKey, user.id)
  return redirect("/home", {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
  })
}

async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"))
}

async function getUserFromSession(request: Request): Promise<any | undefined> {
  const session = await getSession(request)
  const sessionId = session.get(sessionIdKey) as string | undefined
  console.log({ DB, sessionId })
  if (!sessionId) {
    console.error("failure getting the user from session ID")
    return undefined
  }
  return DB[sessionId]
}

export {
  getSession,
  getUserFromSession,
  authorize,
  callback,
}