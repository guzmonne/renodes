import type { MetaFunction, LoaderFunction } from "remix";

import { signIn } from "../server/session.server";

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes Sign In",
    description: "ReNodes sign in page",
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  return signIn(request)
}