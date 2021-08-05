import type { MetaFunction, LoaderFunction } from "remix";

import { authorize } from "../server/session.server";

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes Sign In",
    description: "ReNodes Sign In page",
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  return authorize(request)
}