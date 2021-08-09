import { useState } from "react"
import { useRouteData, json } from "remix"
import { useLocation, useParams } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "react-query"
import { DndProvider } from "react-dnd-multi-backend"
import { IdProvider } from "@radix-ui/react-id"
import HTML5toTouch from "react-dnd-multi-backend/dist/cjs/HTML5toTouch"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import type { HeadersFunction, MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix"

import BaseStyles from "../styles/base.css"
import LayoutStyles from "../components/Layout/styles.css"
import LoaderStyles from "../components/Utils/Loader.css"
import etag from "../server/etag.server"
import { getUserFromSession } from "../server/session.server"
import { repository } from "../repositories/tasks.server"
import { Task } from "../models/task"
import { NavBar } from "../components/Layout/NavBar"
import { Tasks } from "../components/Tasks"
import type { TaskBody } from "../models/task"
import type { UserBody } from "../models/user"

export const meta: MetaFunction = ({ params }) => {
  return {
    title: "ReTask",
    description: params.branch === "home" ? `Home Tasks` : `Tasks for branch #${params.branch}`
  }
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return { Etag: `W\\${loaderHeaders.get("Etag")}` }
}

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: BaseStyles },
    { rel: "stylesheet", href: LayoutStyles },
    { rel: "stylesheet", href: LoaderStyles },
  ]
}

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    let user: UserBody | undefined = undefined
    const tasks = await repository.query({ branch: params.branch === "home" ? undefined : params.branch })
    const data = tasks.map(Task.toObject)
    if (request.headers.get("Accept") !== "application/json") {
      try {
        user = (await getUserFromSession(request)).toObject()
      } catch (err) {
        if (err.name !== "TokenExpiredError") throw err
      }
    }
    return json({ data, user }, {
      headers: { Etag: etag(JSON.stringify(data)) }
    })
  } catch (err) {
    console.log("error at /$branch")
    console.log(err)
    return []
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  const endpoint = "/" + params.branch
  try {
    let task: Task
    const data = new URLSearchParams(await request.text())
    const id = data.get("id")
    const content = data.get("content")
    const dragId = data.get("dragId")
    const meta = data.get("meta")
    let afterId = data.get("afterId")
    let branch = data.get("branch") || params.branch
    if (branch === "home") branch = undefined
    if (afterId === null) afterId = undefined
    switch (request.method) {
      case "POST":
        if (dragId) {
          await repository.after(dragId, branch, afterId)
          break
        }
        if (id === null) return endpoint
        task = new Task({ id, content, branch })
        await repository.put(task, afterId)
        break
      case "PUT":
        if (id === null) return endpoint
        task = await repository.get(id)
        await repository.update(task.set({ content }))
        break
      case "PATCH":
        if (id === null || meta === null) return endpoint
        const metadata = new URLSearchParams(meta)
        await repository.meta(id, { isOpened: metadata.get("isOpened") === "true" })
        break
      case "DELETE":
        await repository.delete(branch)
        break
    }
  } catch (err) {
    console.error(err)
  }
  return endpoint
}

const queryClient = new QueryClient()

export default function () {
  const { search } = useLocation()
  const { branch } = useParams()
  const { data, user } = useRouteData<{ data: TaskBody[], user: UserBody | undefined }>()
  const query = new URLSearchParams(search)

  return (
    <IdProvider>
      <ScrollArea.Root className="ScrollArea__Root">
        <ScrollArea.Viewport className="ScrollArea__Viewport">
          <QueryClientProvider client={queryClient}>
            <main>
              {query.get("navbar") !== "none" && <NavBar user={user} />}
              <DndProvider options={HTML5toTouch}>
                <Tasks branch={branch} initialData={data} />
              </DndProvider>
            </main>
          </QueryClientProvider>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="ScrollArea__Thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </IdProvider>
  )
}
