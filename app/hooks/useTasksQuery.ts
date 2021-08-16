import { useCallback, useState } from "react"
import { useQueryClient, useQuery, useMutation } from "react-query"
import { ulid } from "ulid"

import { Task, isTask } from "../models/task"
import type { TaskBody, TaskPatch, TaskMeta } from "../models/task"

const headers = new Headers()
headers.append("Accept", "application/json")
headers.append("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")

export function useTasksQuery(id: string, initialData: Task | TaskBody) {
  const queryClient = useQueryClient()
  /**
   * Fetch a Task and its collection by id.
   */
  const { data, ...query } = useQuery<Task>(id, () => {
    console.log(data.meta.isOpened)
    return !data.meta.isOpened
      ? Promise.resolve(data)
      : fetch(`/${id}`, { headers })
        .then((response) => response.json())
        .then((body) => {
          if (body.error) throw body.error
          const newTask = new Task(body.data)
          if (data) {
            data.collection.forEach((task: Task) => {
              if (!task.meta.isInEditMode) return
              const index = newTask.collection.findIndex((t: Task) => t.id === task.id)
              if (!index) return
              newTask.collection = [
                ...newTask.collection.slice(0, index),
                newTask.collection[index].set({ meta: { isInEditMode: true } }),
                ...newTask.collection.slice(index + 1)]
            })
          }
          return newTask
        })
  }, {
    initialData: (): Task => isTask(initialData) ? initialData : new Task(initialData),
    staleTime: 1000,

  })
  /**
   * addTaskMutation adds a new Task to the collection.
   * @param task - `Task` to add.
   * @param afterTask - `Task` after which the new `Task` should be added.
   */
  const addTaskMutation = useMutation(({ body, afterId }) => {
    return fetch(`/${afterId === undefined ? data.id : data.parent}`, {
      method: "post",
      headers,
      body: toFormBody({ ...body, afterId })
    })
      .then(response => {
        if (response.ok) return data
        throw new Error("couldn't create new task")
      })
  }, {
    onMutate: async ({ body, afterId }: { body: TaskBody, afterId?: string }): Promise<{ previousTask: Task, previousParentTask: Task }> => {
      await queryClient.cancelQueries(data.id)
      const newTask = (new Task(body)).set({ meta: { isInEditMode: true } })
      const previousTask: Task = queryClient.getQueryData(data.id)
      const previousParentTask: Task = queryClient.getQueryData(data.parent)
      if (afterId === undefined) {
        queryClient.setQueryData(data.id, (task: Task): Task => {
          return task.set({ collection: [...task.collection, newTask] })
        })
      } else {
        queryClient.setQueryData(data.parent || "home", (task: Task): Task => {
          const index = task.collection.findIndex(t => t.id === afterId)
          const afterTask = task.collection[index]
          return task.set({
            collection: [...task.collection.slice(0, index), afterTask, newTask, ...task.collection.slice(index + 1)]
          })
        })
      }
      return { previousTask, previousParentTask }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(data.id, context.previousTask)
      queryClient.setQueryData(data.parent, context.previousParentTask)
    },
    onSettled: () => {
      queryClient.invalidateQueries(data.id, { exact: true, refetchActive: false })
    }
  })
  /**
   * updateTaskMutation updates the values of the Node.
   * @param task - `Task` to update.
   */
  const updateTaskMutation = useMutation((body) => {
    return fetch(`/${id}`, {
      method: "put",
      headers,
      body: toFormBody(body)
    })
      .then(response => {
        if (response.ok) return data
        throw new Error("couldn't update task")
      })
  }, {
    onMutate: async (patch: TaskPatch): Promise<{ previousTask: Task, previousParentTask: Task }> => {
      await queryClient.cancelQueries(id, { exact: true })
      const previousTask: Task = queryClient.getQueryData(id)
      const newTask = data.set(patch)
      queryClient.setQueryData(id, newTask)
      const previousParentTask: Task = queryClient.getQueryData(data.parent || "home")
      const index = previousParentTask.collection.findIndex((t: Task) => t.id === id)
      queryClient.setQueryData(data.parent || "home", (parentTask: Task): Task => parentTask.set({
        collection: [...parentTask.collection.slice(0, index), newTask, ...parentTask.collection.slice(index + 1)]
      }))
      return { previousTask, previousParentTask }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(data.id, context.previousParentTask)
      queryClient.setQueryData(id, context.previousTask)
    },
    onSettled: () => {
      queryClient.invalidateQueries(id, { exact: true, refetchActive: false })
    }
  })
  /**
   * metaTaskMutation updates the metadata of a `Task` using an
   * Optimistic UI workflow.
   * @param task - `Task` whose metadata should be updated.
   */
  const metaTaskMutation = useMutation((meta) => (
    fetch(`/${id}`, {
      method: "PATCH",
      headers,
      body: toFormBody({ meta })
    })
      .then(response => {
        if (response.ok) return data
        throw new Error("couldn't update task")
      })
  ), {
    onMutate: async (meta: TaskMeta): Promise<{ previousTask: Task, previousParentTask: Task }> => {
      await queryClient.cancelQueries(id)
      const previousTask: Task = queryClient.getQueryData(id)
      const newTask = data.set(data.set({ meta }))
      queryClient.setQueryData(id, newTask)
      const previousParentTask: Task = queryClient.getQueryData(data.parent || "home")
      const index = previousParentTask.collection.findIndex((t: Task) => t.id === id)
      queryClient.setQueryData(data.parent || "home", (parentTask: Task): Task => parentTask.set({
        collection: [...parentTask.collection.slice(0, index), newTask, ...parentTask.collection.slice(index + 1)]
      }))
      return { previousTask, previousParentTask }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(data.id, context.previousParentTask)
      queryClient.setQueryData(id, context.previousTask)
    },
    onSettled: () => {
      queryClient.invalidateQueries(id, { exact: true, refetchActive: false })
    }
  })
  /**
   * deleteTaskMutation handles the deletion of the Task.
   */
  const deleteTaskMutation = useMutation(() => {
    return fetch(`/${id}`, {
      method: "delete",
      headers,
    })
      .then(response => {
        if (response.ok) return data
        throw new Error("couldn't delete task")
      })
  }, {
    onMutate: async (): Promise<{ previousParentTask: Task }> => {
      await queryClient.cancelQueries(id)
      const previousParentTask: Task = queryClient.getQueryData(data.parent || "home")
      queryClient.setQueryData(data.parent || "home", (task: Task): Task => task.set({
        collection: task.collection.filter(t => t.id !== id)
      }))
      return { previousParentTask }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(data.parent || "home", context.previousParentTask)
    },
    onSettled: () => {
      queryClient.invalidateQueries(data.parent || "home", { exact: true, refetchActive: false })
    }
  })
  /**
   * dragTaskMutation handles draggin a `Task` after another
   * using an Optimistic UI workflow.
   * @param dragIndex - Index of the `Task` being dragged.
   * @param hoverIndex - Index of the `Task` being hovered.
   */
  const dragTaskMutation = useMutation(({ dragIndex, hoverIndex }) => {
    const dragTask = data.collection[dragIndex]
    const afterTask = hoverIndex !== 0
      ? data.collection[dragIndex < hoverIndex ? hoverIndex : hoverIndex - 1]
      : undefined
    const body: { dragId: string, afterId?: string } = { dragId: dragTask.id }
    if (afterTask) body.afterId = afterTask.id
    return fetch(`/${id}`, {
      method: "post",
      headers,
      body: toFormBody(body)
    })
      .then(response => {
        if (response.ok) return data
        throw new Error("couldn't drag task")
      })
  }, {
    onMutate: async ({ dragIndex, hoverIndex }: { dragIndex: number, hoverIndex: number }): Promise<{ previousTask: Task }> => {
      await queryClient.cancelQueries(id)
      const previousTask: Task = queryClient.getQueryData(id)
      queryClient.setQueryData(id, (task: Task): Task => {
        const dragTask = task.collection[dragIndex]
        const collection = [...task.collection]
        collection.splice(dragIndex, 1)
        collection.splice(hoverIndex, 0, dragTask)
        return task.set({ collection })
      })
      return { previousTask }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(id, context.previousTask)
    },
    onSettled: () => {
      queryClient.invalidateQueries(id, { exact: true, refetchActive: false })
    }
  })
  /**
   * handleAddEmpty handles the creation of a new empty `Task`.
   */
  const handleAddEmpty = useCallback(() => {
    addTaskMutation.mutate({ body: { id: ulid(), parent: id, content: "" } })
  }, [addTaskMutation])
  /**
   * handleAdd handles the creation of a new `Task`.
   * @param body - Body of the new Task.
   * @param afterId - Id of the Task after which the new Task should be inserted.
   */
  const handleAddAfter = useCallback(() => {
    addTaskMutation.mutate({ body: { id: ulid(), content: "", parent: data.parent }, afterId: data.id })
  }, [addTaskMutation, data])
  /**
   * handleDelete handles the deletion of the `Task`.
   */
  const handleDelete = useCallback(() => {
    confirm("Are you sure you want to delete this Task?") && deleteTaskMutation.mutate()
  }, [deleteTaskMutation])
  /**
   * handleEdit handles the edition of the `Task`.
   * @param patch - Patch to set on the `Task`.
   * @param fetch - Flag that allows editing the `Task` without an API call.
   */
  const handleEdit = useCallback((patch: TaskPatch, fetch: boolean = true) => {
    if (!fetch) {
      queryClient.setQueryData(id, (task: Task) => task.set(patch))
      queryClient.setQueryData(data.parent || "home" || "home", (task: Task) => {
        const index = task.collection.findIndex((t: Task) => t.id === id)
        return task.set({
          collection: [...task.collection.slice(0, index), task.collection[index].set(patch), ...task.collection.slice(index + 1)]
        })
      })
    } else {
      updateTaskMutation.mutate(patch)
    }
  }, [updateTaskMutation])
  /**
   * handleMeta handles a `Task's` metadata updates.
   * @param task - Task whose metadata should be updated.
   */
  const handleMeta = useCallback((meta: TaskMeta) => {
    metaTaskMutation.mutate(meta)
  }, [metaTaskMutation])
  /**
   * handleDrag handles dragging `Tasks` inside it's collection.
   * @param dragIndex - Index of `Task` being dragged.
   * @param hoverIndex - Index of `Task` where it's being dropped.
   */
  const handleDrag = useCallback((dragIndex: number, hoverIndex: number) => {
    dragTaskMutation.mutate({ dragIndex, hoverIndex })
  }, [dragTaskMutation])
  /**
   * Export
   */
  return {
    data,
    query,
    addTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    dragTaskMutation,
    metaTaskMutation,
    handleAddAfter,
    handleAddEmpty,
    handleDelete,
    handleEdit,
    handleMeta,
    handleDrag,
  }
}
/**
 * Functions
 */
/**
 * toFormBody converts an object into a valid form encoded string.
 * @param obj - Object to stringify.
 */
function toFormBody(obj: any): string {
  const formBody = []
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    let encodedKey = encodeURIComponent(key)
    let encodedVal = typeof value === "object" ? toFormBody(value) : encodeURIComponent(value as any)
    formBody.push(encodedKey + "=" + encodedVal)
  }
  return formBody.join("&")
}