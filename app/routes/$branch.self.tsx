import { useRouteData } from "remix"
import { useLocation, useParams } from "react-router-dom"
import { useQuery } from "react-query"
import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { MetaFunction, LoaderFunction, LinksFunction } from "remix";

import base from "../styles/base.css"
import Loader from "../components/utils/Loader.css"
import { NavBar } from "../components/layout/NavBar"
import { Tasks } from "../components/tasks/Tasks"
import { Task } from "../models/task"
import { repository } from "../repositories/tasks.server"
import type { TaskBody } from "../models/task"

export const meta: MetaFunction = ({ params }) => {
  return {
    title: "ReTask",
    description: `Task #${params.branch}`
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
    const self = await repository.get(params.branch)
    if (self === undefined) {
      return new Response(JSON.stringify({ error: `can't find task with id ${params.branch}` }), { status: 404 })
    }
    return Task.toJSON(self)
  } catch (err) {
    console.log("error at /$id/self")
    console.log(err)
    return []
  }
}

export default function () {
  const initialData = useRouteData<TaskBody>()
  const { data } = useQuery<TaskBody>("tasks", getSelf, { initialData: initialData })

  return (
    <ScrollArea.Root className="ScrollArea__Root">
      <ScrollArea.Viewport className="ScrollArea__Viewport">
        <main>
          <NavBar />
          <Tasks.Task task={new Task(data)} />
        </main>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="ScrollArea__Thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )

  async function getSelf(): Promise<TaskBody> {
    return { id: "A", content: "EMPTY" }
  }
}
