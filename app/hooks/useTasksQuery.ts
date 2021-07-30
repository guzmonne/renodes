import { useCallback } from "react"
import { useQueryClient, useQuery, useMutation } from "react-query"
import { ulid } from "ulid"

import { Task } from "../models/task"

export function useTasksQuery(branch: string, initialData?: Task[]) {
  const queryClient = useQueryClient()
  const { data: tasks, ...props } = useQuery<Task[]>(branch, () => fetch(`/api/tasks/${branch}`).then(response => response.json()).then(Task.collection), { initialData })
  /**
   * createTaskMutation handles the creation of a new `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to create.
   */
  const createTaskMutation = useMutation((task) => {
    return fetch(`/api/tasks/${branch}`, {
      method: "post",
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: toFormBody(Task.toJSON(task))
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't create new task")
      })
  }, {
    onMutate: async (task: Task): Promise<{ previousTasks: Task[] }> => {
      await queryClient.cancelQueries(branch)
      const previousTasks: Task[] = queryClient.getQueryData(branch)
      queryClient.setQueryData(branch, (tasks: Task[]): Task[] => [...tasks, task])
      return { previousTasks }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(branch, context.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries(branch)
    }
  })
  /**
   * updateTaskMutation handles the updates of a `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to update.
   */
  const updateTaskMutation = useMutation((task) => (
    fetch(`/api/tasks/${branch}`, {
      method: "put",
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: toFormBody(Task.toJSON(task))
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
      queryClient.invalidateQueries(branch)
    }
  })
  /**
   * deleteTaskMutation handles the deletion of a `Task` using
   * an Optimistic UI workflow.
   * @param task - `Task` to delete.
   */
  const deleteTaskMutation = useMutation((task) => (
    fetch(`/api/tasks/${branch}`, {
      method: "delete",
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    })
      .then(response => {
        if (response.ok) return task
        throw new Error("couldn't delete task")
      })
  ), {
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
      queryClient.invalidateQueries(branch)
    }
  })
  /**
   * dragTaskMutation handles draggin a `Task` after another
   * using an Optimistic UI workflow.
   * @param task - `Task` to drag.
   */
  const dragTaskMutation = useMutation(({ dragIndex, hoverIndex }) => {
    const task = tasks[dragIndex]
    const after = hoverIndex !== 0
      ? tasks[dragIndex < hoverIndex ? hoverIndex : hoverIndex - 1]
      : undefined
    return fetch(`/api/tasks/${branch}`, {
      method: "post",
      body: toFormBody({ dragId: task.id, afterId: after.id })
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
      queryClient.invalidateQueries(branch)
    }
  })
  /**
   * handleAdd handles the creation of new `Tasks`.
   * @param task - Task to add to the list.
   */
  const handleAdd = useCallback(() => {
    const task = new Task({ id: ulid(), branch, content: "" })
    createTaskMutation.mutate(task)
  }, [createTaskMutation])
  /**
   * handleDelete allows a Child component to remove a task from the list.
   */
  const handleDelete = useCallback((task: Task) => {
    deleteTaskMutation.mutate(task)
  }, [deleteTaskMutation])
  /**
   * handleEdit handles `Task` updated.
   */
  const handleEdit = useCallback((task: Task) => {
    updateTaskMutation.mutate(task)
  }, [updateTaskMutation])
  /**
   * Export
   */
  return {
    tasks,
    ...props,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    dragTaskMutation,
    handleAdd,
    handleDelete,
    handleEdit,
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
  for (let key in obj) {
    let encodedKey = encodeURIComponent(key)
    let encodedVal = encodeURIComponent(obj[key])
    formBody.push(encodedKey + "=" + encodedVal)
  }
  return formBody.join("&")
}