import { useRouteData } from "remix"
import { useLocation, useParams } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "react-query"
import { DndProvider } from "react-dnd-multi-backend"
import { IdProvider } from "@radix-ui/react-id"
import HTML5toTouch from "react-dnd-multi-backend/dist/cjs/HTML5toTouch"

import * as ScrollArea from "@radix-ui/react-scroll-area"
import type { MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix"

import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../models/task"
import { repository } from "../repositories/tasks"
import type { TaskObject } from "../models/task"

export const meta: MetaFunction = ({ params }) => {
  return {
    title: "ReTask",
    description: params.branch === "home" ? `Home Tasks` : `Tasks for branch #${params.branch}`
  }
}

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ]
}

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const tasks = await repository.query({ branch: params.branch === "home" ? undefined : params.branch })
    return tasks.map(Task.toJSON)
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
        console.log({ content })
        task = await repository.get(id)
        await repository.update(task.set({ content }))
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

export default function () {
  const { search } = useLocation()
  const { branch } = useParams()
  const initialData = useRouteData<TaskObject[]>()
  const query = new URLSearchParams(search)
  const queryClient = new QueryClient()

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
