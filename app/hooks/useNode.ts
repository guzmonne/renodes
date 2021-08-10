import { useRef, useState, useCallback, useEffect } from "react"
import { useDrag, useDrop } from "react-dnd"
import cn from "classnames"
import type { ChangeEvent, KeyboardEvent } from "react"

import { useNodesContext } from "./useNodesContext"
import { useDebounce } from "./useDebounce"
import { Task } from "../models/task";

/**
 * TaskDrag represents a Task being dragged.
 */
export interface TaskDrag {
  /**
   * dragIndex corresponds to the index of the `Tasks` being dragged.
   */
  dragIndex: number;
  /**
   * hoverIndex corresponds to the index of the `Tasks` that is being hovered.
   */
  hoverIndex: number;
  /**
   * id is the unique identifier of the task.
   */
  id: string
  /**
   * type indicates the type of the Task being dragged.
   */
  type: string
}

export function useNode(node: Task, index: number) {
  const ref = useRef<any>(null)
  const [content, setContent] = useState(node.content)
  const {
    handleAdd,
    handleEdit,
    handleDelete,
    handleMeta,
    handleDrag,
    handleDragEnd,
    hoverIndex,
    dragIndex,
  } = useNodesContext()
  const handleSubmit = useCallback((e) => e.preventDefault(), [])
  const handleSelectAdd = useCallback(() => handleAdd(node), [handleAdd, node])
  const handleSelectDelete = useCallback(() => handleDelete(node), [handleDelete, node])
  const handleSelectExternalLink = useCallback(() => window.open(window.location.origin + "/" + node.id), [node])
  const handleToggleSubTasks = useCallback(() => handleMeta(node.set({ meta: { isOpened: !node.meta.isOpened } })), [node])
  const handleContentChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.currentTarget.value), [setContent])
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) return
    switch (e.key) {
      case "Enter": { e.preventDefault(); handleSelectAdd(); break }
      case "Delete": { e.preventDefault(); handleSelectDelete(); break }
    }
  }, [handleSelectAdd, handleSelectDelete])
  const [textAreaClasses, setTextAreaClasses] = useState("")

  useEffect(() => setContent(node.content), [node.content])

  useEffect(() => setTextAreaClasses(cn({
    hoverTop: hoverIndex === index && dragIndex > index,
    hoverBottom: hoverIndex === index && dragIndex < index
  })), [index, hoverIndex, dragIndex])

  const [{ handlerId }, drop] = useDrop({
    accept: node.branch || "TASK",
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item: TaskDrag) => {
      if (!ref.current || index === undefined) return
      const { dragIndex, hoverIndex } = item
      if (hoverIndex === index) return
      item.hoverIndex = index
      handleDrag(dragIndex, index)
    }
  })

  const [_, drag, preview] = useDrag({
    type: node.branch || "TASK",
    item: () => ({ id: node.id, dragIndex: index, type: node.branch || "TASK" }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => handleDragEnd(item.dragIndex, item.hoverIndex)
  })

  useDebounce(() => {
    if (content === node.content) return
    const updatedTask = node.set({ content })
    handleEdit(updatedTask)
  }, 1000, [content])

  drop(preview(ref))

  return {
    ref,
    content,
    handleSubmit,
    handleSelectAdd,
    handleSelectDelete,
    handleSelectExternalLink,
    handleToggleSubTasks,
    handleContentChange,
    handleKeyDown,
    handlerId,
    drop,
    drag,
    preview,
    textAreaClasses,
  }
}