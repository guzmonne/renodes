import { useRouteData } from "remix"
import type { MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix";

import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../models/task"
import { repository } from "../repositories/tasks"
import type { TaskObject } from "../models/task"

export const meta: MetaFunction = () => {
  return {
    title: "ReTask",
    description: "Nested task manager",
  };
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ];
};

export const loader: LoaderFunction = async () => {
  try {
    const tasks = await repository.query()
    return tasks.map(Task.toJSON)
  } catch (err) {
    console.log(err)
    return []
  }
};

export const action: ActionFunction = async ({request}) => {
  try {
    let task: Task
    const data    = new URLSearchParams(await request.text())
    const id      = data.get("id")
    const content = data.get("content")
    const dragId  = data.get("dragId")
    const afterId = data.get("afterId")
    if (id === null && dragId === null) return "/"
    switch (request.method) {
      case "POST":
        if (dragId) {
          await repository.after(dragId, undefined, afterId)
          break
        }
        task = new Task({id, content})
        await repository.put(task)
        break
      case "PUT":
        task = await repository.get(id)
        await repository.update(task.set({content}))
        break
      case "DELETE":
        await repository.delete(id)
        break
    }
  } catch(err) {
    console.log("error at /")
    console.error(err)
    return "/error"
  }
  return "/"
}

export default function() {
  const data = useRouteData<TaskObject[]>()

  return (
    <main>
      <NavBar />
      <Tasks collection={Task.collection(data)}/>
    </main>
  )
}