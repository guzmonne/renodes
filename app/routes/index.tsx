import type { MetaFunction, LoaderFunction } from "remix";

import { redirect } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return {
    title: "ReNodes",
    description: "Recursive Node Manager",
  }
}

export const loader: LoaderFunction = async () => {
  return redirect("/home")
}