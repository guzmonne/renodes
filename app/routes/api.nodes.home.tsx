import { json, useRouteData } from "remix"
import type { MetaFunction, LoaderFunction, LinksFunction } from "remix"

import APIDocsStyles from "../components/APIDocs/styles.css"
import ScrollAreaStyles from "../components/ScrollArea/styles.css"
import etag from "../server/etag.server"
import { Task } from "../models/task"
import { repository } from "../repositories/tasks.server"
import { APIDocs } from "../components/APIDocs"
import type { TaskBody } from "../models/task"

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

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    const tasks = await repository.query({ branch: undefined })
    const data = tasks.map(Task.toObject)
    return json({ data }, {
      headers: { Etag: etag(JSON.stringify(data)) }
    })
  } catch (err) {
    console.error(err)
    return json({ error: err.message, statusCode: 400 }, {
      status: 400,
      statusText: "Error"
    })
  }
}

export default function UsersMe() {
  const { data, error, statusCode } = useRouteData<{ data: TaskBody[], error: string, statusCode?: number }>()

  return (
    <APIDocs endpoint="/api/nodes/home" statusCode={statusCode || 200}>
      {error
        ? error
        : JSON.stringify(data, null, 2)
      }
    </APIDocs>
  )
}