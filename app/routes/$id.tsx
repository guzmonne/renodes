import { useRouteData, json, redirect } from "remix"
import { useLocation } from "react-router-dom"
import { DndProvider } from "react-dnd-multi-backend"
import { IdProvider } from "@radix-ui/react-id"
import HTML5toTouch from "react-dnd-multi-backend/dist/cjs/HTML5toTouch"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { QueryClient, QueryClientProvider } from 'react-query'
import type { HeadersFunction, MetaFunction, LoaderFunction, ActionFunction, LinksFunction } from "remix"

import { getUserFromSession, signIn, signOut } from "../server/session.server"
import { NavBar } from "../components/Layout/NavBar"
import { repository } from "../repositories/nodes.server"
import { NodesTree } from "../components/Nodes/NodesTree"
import etag from "../server/etag.server"
import BaseStyles from "../styles/base.css"
import LayoutStyles from "../components/Layout/styles.css"
import LoaderStyles from "../components/Utils/Loader.css"
import ScrollAreaStyles from "../components/ScrollArea/styles.css"
import type { NodeItem } from "../models/node"
import type { UserBody } from "../models/user"

export const meta: MetaFunction = ({ params }) => {
  return {
    title: "ReNodes",
    description: params.id === "home" ? `Home Nodes` : `Nodes for parent #${params.id}`
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
    { rel: "stylesheet", href: ScrollAreaStyles },
  ]
}

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    let user: UserBody | undefined = undefined
    if (request.headers.get("Accept") !== "application/json") {
      try {
        const sessionUser = await getUserFromSession(request)
        user = sessionUser.toObject()
      } catch (err) {
        if (err.name === "TokenExpiredError" && Date.now() - (new Date(err.expiredAt)).getTime() <= 1000 * 60 * 60 * 24 * 30) {
          return signIn(request, `/${params.id}`)
        }
        if (err.name !== "ModelNotFoundError" && err.name !== "UndefinedTokenError") {
          return signOut(request)
        }
      }
    }
    const node = await repository.get(params.id, undefined, true)
    const body = { data: node, user }
    return json(body, {
      headers: {
        "Etag": etag(JSON.stringify(body)),
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    })
  } catch (err) {
    console.log("loader error:")
    console.error(err)
    return json({ error: err.message }, {
      status: err.name === "ModelNotFound" ? 404 : 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    })
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const data = new URLSearchParams(await request.text())
    const id = data.get("id")
    const content = data.get("content")
    const interpreter = data.get("interpreter")
    const dragId = data.get("dragId")
    const meta = data.get("meta")
    const afterId = data.get("afterId") || undefined
    switch (request.method) {
      case "POST":
        if (dragId) {
          await repository.after(dragId, params.id, afterId)
        } else {
          await repository.put({ id, content, interpreter, parent: params.id }, afterId)
        }
        break
      case "PUT":
        await repository.update(params.id, { content, interpreter })
        break
      case "PATCH":
        if (meta === null) break
        const metadata = new URLSearchParams(meta)
        await repository.meta(params.id, { isOpened: metadata.get("isOpened") === "true" })
        break
      case "DELETE":
        await repository.delete(params.id)
        break
    }
    return `/${params.id}`
  } catch (err) {
    console.error(err)
    return redirect("/404", {
      status: 400,
      statusText: err.message
    })
  }
}

const queryClient = new QueryClient()

export default function () {
  const { data, user } = useRouteData<{ data: NodeItem, user: UserBody | undefined, error?: string }>()
  const { search } = useLocation()

  const query = new URLSearchParams(search)

  if (!data) return <div>Error</div>

  return (
    <IdProvider>
      <ScrollArea.Root className="ScrollArea__Root">
        <ScrollArea.Viewport className="ScrollArea__Viewport">
          <main>
            {query.get("navbar") !== "none" && <NavBar user={user} />}
            <QueryClientProvider client={queryClient}>
              <DndProvider options={HTML5toTouch}>
                <NodesTree root={data} />
              </DndProvider>
            </QueryClientProvider>
          </main>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="ScrollArea__Thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </IdProvider >
  )
}
