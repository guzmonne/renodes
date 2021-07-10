import { Fragment, useEffect } from "react"
import { useRouteData } from "remix"
import { useLocation } from "react-router-dom"
import type { MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix";

import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../api/models/task"
import { repository } from "../api/repositories/tasks"
import type { TaskObject } from "../api/models/task"

export const meta: MetaFunction = ({params}) => {
  return {
    title: "ReTask",
    description: `Task #${params.id}`
  };
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ];
};

export const loader: LoaderFunction = async ({request, params}) => {
  try {
    const query = (new URL(request.url)).searchParams
    const tasksPromise = repository.query({branch: params.id}).then(tasks => tasks.map(Task.toJSON))
    const promises: Promise<any>[] = [tasksPromise]
    if (query.get("task") !== "none") {
      const taskPromise = repository.get(params.id).then(Task.toJSON)
      promises.push(taskPromise)
    }
    const [tasks, task] = await Promise.all(promises)
    return {tasks, task}
  } catch (err) {
    console.log(err)
    return {tasks: []}
  }
};

export const action: ActionFunction = async ({request, params}) => {
  const endpoint = "/" + params.id
  try {
    let task: Task
    const data    = new URLSearchParams(await request.text())
    const id      = data.get("id")
    const content = data.get("content")
    const branch  = params.id
    if (id === null) return endpoint
    switch (request.method) {
      case "POST":
        task = new Task({id, content, branch})
        await repository.put(task)
        break;
      case "PUT":
        task = await repository.get(id)
        await repository.update(task.set({content}))
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
  const data = useRouteData<{task: TaskObject, tasks: TaskObject[]}>()
  const {search} = useLocation()
  const query = new URLSearchParams(search)

  useEffect(() => {
    const resizeObserver = new ResizeObserver(sendDimensions)
    resizeObserver.observe(document.body)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <Fragment>
      {query.get("navbar") !== "none" && <NavBar />}
      {query.get("task") !== "none" && <Tasks.Task task={new Task(data.task)} readOnly />}
      <Tasks collection={Task.collection(data.tasks)} />
    </Fragment>
  );
  /**
   * sendDimensions sends a message to its parent indicating its size.
   */
   function sendDimensions() {
    if (window.parent) {
      const query = new URLSearchParams(search)
      const id = query.get("id")
      const body = document.body
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
      )
      window.parent.postMessage({type: "RESIZE", payload: {height, id}}, "*")
    }
  }
}
