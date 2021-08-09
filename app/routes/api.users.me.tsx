import { json, useRouteData } from "remix"
import type { MetaFunction, LoaderFunction, LinksFunction } from "remix"

import APIDocsStyles from "../components/APIDocs/styles.css"
import ScrollAreaStyles from "../components/ScrollArea/styles.css"
import { APIDocs } from "../components/APIDocs"
import { getUserFromSession } from "../server/session.server"
import type { UserBody } from "../models/user"

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes Sign In",
    description: "ReNodes Sign In page",
  }
}

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: APIDocsStyles },
    { rel: "stylesheet", href: ScrollAreaStyles },
  ]
}

export const loader: LoaderFunction = async ({ request }) => {
  const data = await getUserFromSession(request)
  if (!data || typeof data === "string") {
    return json({ error: data ? data : "invalid jwt", statusCode: 400 }, {
      status: 400,
      statusText: "Error"
    })
  }
  return { data: data.toObject() }
}

export default function UsersMe() {
  const { data, error, statusCode } = useRouteData<{ data: UserBody, error: string, statusCode?: number }>()

  return (
    <APIDocs endpoint="/users/me" statusCode={statusCode || 200}>
      {error
        ? error
        : JSON.stringify(data, null, 2)
      }
    </APIDocs>
  )
}