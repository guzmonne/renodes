import { useCallback } from "react"
import { useQueryClient, useQuery, useMutation } from "react-query"
import { ulid } from "ulid"

import { Task } from "../models/task"
import type { TaskBody } from "../models/task"

const headers = new Headers()
headers.append("Accept", "application/json")
headers.append("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")

export function useTasksQuery(branch: string, initialData?: TaskBody[]) {
  const queryClient = useQueryClient()
  const { data: tasks, ...query } = useQuery<Task[]>(branch, () => (
    fetch(`/${branch}`, { headers })
      .then((response) => response.json())
      .then(({ data }) => Task.collection(data))
  ), {
    initialData: Task.collection(initialData),
  })
  /**
   * createTaskMutation handles the creation of a new `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to create.
   * @param afterTask - `Task` after which the new `Task` should be created.
   */
  const createTaskMutation = useMutation(({ task, afterTask }) => {
    return fetch(`/${branch}`, {
      method: "post",
      headers,
      body: toFormBody({ ...Task.toObject(task), afterId: afterTask ? afterTask.id : undefined })
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't create new task")
      })
  }, {
    onMutate: async ({ task, afterTask }: { task: Task, afterTask?: Task }): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch)
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => {
        if (afterTask === undefined) return [...tasks, task]
        const index = tasks.findIndex(task => task.id === afterTask.id)
        return [...tasks.slice(0, index), afterTask, task, ...tasks.slice(index + 1)]
      })
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch, { exact: true, refetchActive: false })
    }
  })
  /**
   * updateTaskMutation handles the updates of a `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to update.
   */
  const updateTaskMutation = useMutation((task) => (
    fetch(`/${branch}`, {
      method: "put",
      headers,
      body: toFormBody(Task.toObject(task))
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't update task")
      })
  ), {
    onMutate: async (task: Task): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch, { exact: true })
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      const index = previousTasks.findIndex((t: Task) => t.id === task.id)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => [...tasks.slice(0, index), task, ...tasks.slice(index + 1)])
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch, { exact: true, refetchActive: false })
    }
  })
  /**
   * metaTaskMutation updates the metadata of a `Task` using an
   * Optimistic UI workflow.
   * @param task - `Task` whose metadata should be updated.
   */
  const metaTaskMutation = useMutation((task) => (
    fetch(`/${branch}`, {
      method: "PATCH",
      headers,
      body: toFormBody(Task.toObject(task))
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't update task")
      })
  ), {
    onMutate: async (task: Task): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch)
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      const index = previousTasks.findIndex((t: Task) => t.id === task.id)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => [...tasks.slice(0, index), task, ...tasks.slice(index + 1)])
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch, { exact: true, refetchActive: false })
    }
  })
  /**
   * deleteTaskMutation handles the deletion of a `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to delete.
   */
  const deleteTaskMutation = useMutation((task) => {
    return fetch(`/${task.id}`, {
      method: "delete",
      headers,
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't delete task")
      })
  }, {
    onMutate: async (task: Task): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch)
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => tasks.filter(t => t.id !== task.id))
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch, { exact: true, refetchActive: false })
    }
  })
  /**
   * dragTaskMutation handles draggin a `Task` after another
   * using an Optimistic UI workflow.
   * @param dragIndex - Index of the `Task` being dragged.
   * @param hoverIndex - Index of the `Task` being hovered.
   */
  const dragTaskMutation = useMutation(({ dragIndex, hoverIndex }) => {
    const task = tasks[dragIndex]
    const after = hoverIndex !== 0
      ? tasks[dragIndex < hoverIndex ? hoverIndex : hoverIndex - 1]
      : undefined
    const body: { dragId: string, afterId?: string } = { dragId: task.id }
    if (after) body.afterId = after.id
    return fetch(`/${branch}`, {
      method: "post",
      headers,
      body: toFormBody(body)
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't drag task")
      })
  }, {
    onMutate: async ({ dragIndex, hoverIndex }: { dragIndex: number, hoverIndex: number }): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch)
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => {
        const task = tasks[dragIndex]
        const _tasks = [...tasks]
        _tasks.splice(dragIndex, 1)
        _tasks.splice(hoverIndex, 0, task)
        return _tasks
      })
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch, { exact: true, refetchActive: false })
    }
  })
  /**
   * handleAddEmpty handles the creation of a new empty `Task`.
   * @param task - Task to add to the list.
   */
  const handleAddEmpty = useCallback(() => {
    const task = new Task({ id: ulid(), branch, content: "" })
    createTaskMutation.mutate({ task })
  }, [createTaskMutation, branch])
  /**
   * handleAdd handles the creation of new `Tasks`.
   * @param task - Task to add to the list.
   */
  const handleAdd = useCallback((task: Task) => {
    const newTask = new Task({ id: ulid(), branch, content: "" })
    createTaskMutation.mutate({ task: newTask, afterTask: task })
  }, [createTaskMutation, branch])
  /**
   * handleDelete allows a Child component to remove a task from the list.\
   * @param task - Task to be deleted.
   */
  const handleDelete = useCallback((task: Task) => {
    confirm("Are you sure you want to delete this Task?") && deleteTaskMutation.mutate(task)
  }, [deleteTaskMutation])
  /**
   * handleEdit handles `Task` updated.
   * @param task - Task to be updated.
   */
  const handleEdit = useCallback((task: Task) => {
    updateTaskMutation.mutate(task)
  }, [updateTaskMutation])
  /**
   * handleMeta handles a `Task` metadata updates.
   * @param task - Task whose metadata should be updated.
   */
  const handleMeta = useCallback((task: Task) => {
    metaTaskMutation.mutate(task)
  }, [metaTaskMutation])
  /**
   * Export
   */
  return {
    tasks,
    query,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    dragTaskMutation,
    metaTaskMutation,
    handleAdd,
    handleAddEmpty,
    handleDelete,
    handleEdit,
    handleMeta,
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