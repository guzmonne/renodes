import { useRouteData, json } from "remix"
import { useLocation, useParams } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "react-query"
import { DndProvider } from "react-dnd-multi-backend"
import { IdProvider } from "@radix-ui/react-id"
import HTML5toTouch from "react-dnd-multi-backend/dist/cjs/HTML5toTouch"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import type { HeadersFunction, MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix"

import etag from "../server/etag.server"
import { repository } from "../repositories/tasks.server"
import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../models/task"
import type { TaskBody } from "../models/task"

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
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ]
}

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    const tasks = await repository.query({ branch: params.branch === "home" ? undefined : params.branch })
    const data = tasks.map(Task.toObject)
    return json(data, {
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
  const initialData = useRouteData<TaskBody[]>()
  const query = new URLSearchParams(search)

  return (
    <IdProvider>
      <ScrollArea.Root className="ScrollArea__Root">
        <ScrollArea.Viewport className="ScrollArea__Viewport">
          <QueryClientProvider client={queryClient}>
            <main>
              {query.get("navbar") !== "none" && <NavBar />}
              <DndProvider options={HTML5toTouch}>
                <Tasks branch={branch} initialData={Task.collection(initialData)} />
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
