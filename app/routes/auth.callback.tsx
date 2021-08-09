import type { MetaFunction, LoaderFunction } from "remix";

import { callback } from "../server/session.server";

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes Sign In",
    description: "ReNodes sign in callback page",
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  return callback(request)
}