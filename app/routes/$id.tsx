import { useRouteData } from "remix"
import { useLocation, useParams } from "react-router-dom"
import { useQuery } from "react-query"
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
    description: params.id === "home" ? `Home Tasks` : `Tasks for branch #${params.id}`
  };
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: base },
    { rel: "stylesheet", href: Loader },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const tasks = await repository.query({ branch: params.id === "home" ? undefined : params.id })
    return tasks.map(Task.toJSON)
  } catch (err) {
    console.log("error at /$id")
    console.log(err)
    return []
  }
}

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
  const { search } = useLocation()
  const { id } = useParams()
  const initialData = useRouteData<TaskObject[]>()
  const { data } = useQuery<TaskObject[]>("tasks", getTasks, { initialData: initialData })
  const query = new URLSearchParams(search)

  return (
    <ScrollArea.Root className="ScrollArea__Root">
      <ScrollArea.Viewport className="ScrollArea__Viewport">
        <main>
          {query.get("navbar") !== "none" && <NavBar />}
          <Tasks collection={Task.collection(data)} />
        </main>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="ScrollArea__Thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )

  async function getTasks(): Promise<TaskObject[]> {


    return []
  }
}
