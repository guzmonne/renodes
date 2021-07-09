import { useRouteData } from "remix"
import type { MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix";

import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../api/models/task"
import { repository } from "../api/repositories/tasks"
import type { TaskObject } from "../api/models/task"

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
    return tasks.map(Task.toObject)
  } catch (err) {
    console.log(err)
    return []
  }
};

export const action: ActionFunction = async ({request}) => {
  const endpoint = "/"
  try {
    let task: Task
    const data    = new URLSearchParams(await request.text())
    const id      = data.get("id")
    const content = data.get("content")
    if (id === null) return endpoint
    switch (request.method) {
      case "POST":
        task = new Task({id, content})
        await repository.put(task)
        break;
      case "PUT":
        task = await repository.get(id)
        task = task.set({content})
        await repository.update(task)
        break
      case "DELETE":
        await repository.delete(id)
        break
    }
  } catch(err) {
    console.error(err)
  }
  return endpoint
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