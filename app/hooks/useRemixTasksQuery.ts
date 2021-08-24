import { useState, useCallback, useEffect } from "react"
import { fetch, useSubmit } from "remix"
import { ulid } from "ulid";

import { Task, isTask } from "../models/task"
import type { TaskBody, TaskPatch, TaskMeta } from "../models/task"

export function useRemixTasksQuery(parent: string, initialData: Task | TaskBody) {
  const submit = useSubmit()
  const [data, setData] = useState((): Task => isTask(initialData) ? initialData : new Task(initialData))

  useEffect(() => {
    setData(isTask(initialData) ? initialData : new Task(initialData))
  }, [initialData])

  /**
   * handleAdd handles the creation of a new `Task`.
   * @param parent - Parent id of the new `Task`.
   * @param afterId - Id of the `Task` after which the new `Task` should be placed.
   */
  const handleAdd = useCallback((parent: string, afterId?: string) => {
    const form = createRemixFormElement(`/${parent}`, "post")
    form
      .input("id", ulid())
      .input("content", "")
      .input("parent", parent)
      .input("afterId", afterId)
    submit(form)
  }, [])
  /**
   * handleDelete handles the deletion of a `Task`.
   * @param id - Id of the `Task` to delete.
   */
  const handleDelete = useCallback((id: string) => {
    const form = createRemixFormElement(`/${id}`, "delete")
    submit(form)
  }, [])
  /**
   * handleEdit handles updates done on a `Task`.
   * @param id - Id of the `Task` to update.
   * @param patch - Patch to apply to the `Task`.
   * @param fetch - Flag to indicate wether a request should be done against the API.
   */
  const handleEdit = useCallback((id: string, patch: TaskPatch, fetch: boolean = true) => {
    const form = createRemixFormElement(`/${id}`, "put")
    patch.content && form.input("content", patch.content)
    patch.interpreter && form.input("interpreter", patch.interpreter)
    submit(form)
  }, [])
  /**
   * handleMeta handles updates on a `Task's`metadata.
   * @param id - Id of the `Task` to update.
   * @param meta - Metadata object to apply.
   * @param fetch - Flag to indicate wether a request should be done against the API.
   */
  const handleMeta = useCallback((id: string, meta: TaskMeta, fetch: boolean = true) => {
    const form = createRemixFormElement(`/${id}`, "patch")
    form.object("meta", meta)
    submit(form)
  }, [])
  /**
   * handleDrag handles dragging a `Task` to another position on its parent collection.
   * @param parent - Id of the parent `Task` holding the `Task` being dragged.
   * @param dragIndex - Index of the `Task` being dragged.
   * @param hoverIndex - Index of where the dragged `Task` should be placed.
   */
  const handleDrag = useCallback((parent: string, dragIndex: number, hoverIndex?: number) => {
    const form = createRemixFormElement(`/${parent}`, "post")
    form
      .input("dragIndex", dragIndex, "number")
      .input("hoverIndex", hoverIndex, "number")
    submit(form)
  }, [])

  return {
    data,
    handleAdd,
    handleDelete,
    handleEdit,
    handleMeta,
    handleDrag,
  }
}
/**
 * Functions
 */
interface RemixHTMLFormElement extends HTMLFormElement {
  input: (name: string, value: any, type?: string) => RemixHTMLFormElement;
  object: (name: string, object: any) => RemixHTMLFormElement;
}
/**
 * createRemixFormElement returns a new form element.
 * @param action - Form action attribute
 * @param method - Form method attribute
 */
function createRemixFormElement(action: string, method: string = "post"): RemixHTMLFormElement {
  const form = document.createElement("form") as RemixHTMLFormElement
  form.setAttribute("action", action)
  form.setAttribute("method", method)
  form.input = (name: string, value: any, type: string = "text") => {
    if (value === undefined || value === null) return form
    const input = document.createElement("input")
    input.setAttribute("name", name)
    input.setAttribute("type", type)
    input.setAttribute("value", value)
    form.appendChild(input)
    return form
  }
  form.object = (name: string, object: any): RemixHTMLFormElement => {
    if (object === undefined || object === null || typeof object !== "object") return form
    const value: string[] = []
    for (let [key, val] of Object.entries(object)) {
      let encodedKey = encodeURIComponent(key)
      let encodedVal = encodeURIComponent(val as any)
      value.push(encodedKey + "=" + encodedVal)
    }
    return form.input(name, value.join("&"))
  }
  return form
}
