import { useState, useEffect, useCallback } from "react"
import cn from "classnames"
import type { ChangeEvent, KeyboardEvent } from "react"

import { useNodesContext } from "./useNodesContext"
import type { Task } from "../models/task";

export function useInterpreter(node: Task, index: number) {
  const [content, setContent] = useState(node.content)
  const {
    handleAdd,
    handleEdit,
    handleDelete,
    hoverIndex,
    dragIndex,
  } = useNodesContext()
  const handleSubmit = useCallback((e) => e.preventDefault(), [])
  const handleContentChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.currentTarget.value), [setContent])
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) return
    switch (e.key) {
      case "Enter": { e.preventDefault(); handleAdd(node); break }
      case "Delete": { e.preventDefault(); handleDelete(node); break }
    }
  }, [handleAdd, handleDelete, node])
  const [hoverClasses, setHoverClasses] = useState("")

  useEffect(() => setContent(node.content), [node.content])

  useEffect(() => setHoverClasses(cn({
    hoverTop: hoverIndex === index && dragIndex > index,
    hoverBottom: hoverIndex === index && dragIndex < index
  })), [index, hoverIndex, dragIndex])

  return {
    content,
    handleSubmit,
    handleContentChange,
    handleKeyDown,
    hoverClasses,
    handleEdit,
  }
}