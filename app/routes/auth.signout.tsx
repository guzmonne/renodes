import type { MetaFunction, LoaderFunction } from "remix";

import { signOut } from "../server/session.server";

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes Sign In",
    description: "ReNodes sign out page",
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  return signOut(request)
}