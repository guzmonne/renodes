import type { MetaFunction, LoaderFunction } from "remix";

import { redirect } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return {
    title: "ReTask",
    description: "Nested task manager",
  }
}

export const loader: LoaderFunction = async () => {
  return redirect("/home")
}