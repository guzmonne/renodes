import { useRouteData } from "remix"
import { useLocation } from "react-router-dom"
import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix";

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
    description: `Task #${params.id}`
  };
};

export const links: LinksFunction = (...args) => {
  return [
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    if (params.id === "home") {
      const tasks = await repository.query()
      return { tasks: tasks.map(Task.toJSON) }
    }
    const query = (new URL(request.url)).searchParams
    const promises: Promise<any>[] = [repository.query({ branch: params.id })]
    if (query.get("task") !== "none") {
      promises.push(repository.get(params.id))
    }
    const [tasks, task] = await Promise.all(promises)
    return {
      tasks: tasks.map(Task.toJSON),
      task: task && Task.toJSON(task)
    }
  } catch (err) {
    console.log("error at /$id")
    console.log(err)
    return { tasks: [] }
  }
};

export const action: ActionFunction = async ({ request, params }) => {
  const endpoint = "/" + params.id
  try {
    let task: Task
    const data = new URLSearchParams(await request.text())
    const id = data.get("id")
    const content = data.get("content")
    const dragId = data.get("dragId")
    const afterId = data.get("afterId")
    const branch = params.id === "home" ? undefined : params.id
    switch (request.method) {
      case "POST":
        if (dragId) {
          await repository.after(dragId, branch, afterId)
          break
        }
        if (id === null) return endpoint
        task = new Task({ id, content, branch })
        await repository.put(task)
        break;
      case "PUT":
        if (id === null) return endpoint
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
  const data = useRouteData<{ task: TaskObject, tasks: TaskObject[] }>()
  const { search } = useLocation()
  const query = new URLSearchParams(search)

  return (
    <ScrollArea.Root className="ScrollArea__Root">
      <ScrollArea.Viewport className="ScrollArea__Viewport">
        <main>
          {query.get("navbar") !== "none" && <NavBar />}
          {query.get("task") !== "none" && data.task && <Tasks.Task task={new Task(data.task)} readOnly />}
          <Tasks collection={Task.collection(data.tasks)} />
        </main>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="ScrollArea__Thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
