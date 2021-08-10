import { useContext, createContext, useState, useCallback } from "react"
import type { ReactNode } from "react"

import { useTasksQuery } from "./useTasksQuery"
import { Task } from "../models/task"
import type { TaskBody } from "../models/task"

export interface NodesContextValue {
  tasks: Task[];
  query: { isLoading: boolean };
  handleAddEmpty: () => void;
  handleAdd: (task: Task) => void;
  handleEdit: (task: Task) => void;
  handleDelete: (task: Task) => void;
  handleMeta: (task: Task) => void;
  handleDrag: (newDragIndex: number, newHoverIndex: number) => void;
  handleDragEnd: (dragIndex: number, hoverIndex: number) => void;
  dragIndex: number;
  hoverIndex: number;
  branch: string;
}

export interface NodesProviderProps {
  branch: string;
  initialData?: TaskBody[];
  children: ReactNode;
}

export const NodesContext = createContext<NodesContextValue>(undefined)

export function NodesProvider({ branch, initialData, children }: NodesProviderProps) {
  const [[dragIndex, hoverIndex], setIndexes] = useState<number[]>([])
  const {
    tasks,
    query,
    handleAddEmpty,
    handleAdd,
    handleEdit,
    handleDelete,
    handleMeta,
    dragTaskMutation,
  } = useTasksQuery(branch, initialData)
  const handleDrag = useCallback((newDragIndex: number, newHoverIndex: number) => (
    setIndexes([newDragIndex, newHoverIndex])
  ), [setIndexes])
  const handleDragEnd = useCallback((dragIndex: number, hoverIndex: number) => {
    setIndexes([])
    if (dragIndex === hoverIndex) return
    dragTaskMutation.mutate({ dragIndex, hoverIndex })
  }, [setIndexes, dragTaskMutation])

  return (
    <NodesContext.Provider value={{
      tasks,
      query,
      handleAddEmpty,
      handleAdd,
      handleEdit,
      handleDelete,
      handleMeta,
      handleDrag,
      handleDragEnd,
      dragIndex,
      hoverIndex,
      branch,
    }}>
      {children}
    </NodesContext.Provider>
  )
}

export function useNodesContext() {
  const context = useContext(NodesContext)

  if (context === undefined) {
    throw new Error("useNodesContext must be used withing a NodesProvider")
  }

  return context
}