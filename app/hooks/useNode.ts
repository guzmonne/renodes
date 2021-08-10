import { useRef, useCallback } from "react"
import { useDrag, useDrop } from "react-dnd"

import { useNodesContext } from "./useNodesContext"
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
  const {
    handleAdd,
    handleDelete,
    handleMeta,
    handleDrag,
    handleDragEnd,
    hoverIndex,
    dragIndex,
  } = useNodesContext()
  const handleSelectAdd = useCallback(() => handleAdd(node), [handleAdd, node])
  const handleSelectDelete = useCallback(() => handleDelete(node), [handleDelete, node])
  const handleSelectExternalLink = useCallback(() => window.open(window.location.origin + "/" + node.id), [node])
  const handleToggleSubTasks = useCallback(() => handleMeta(node.set({ meta: { isOpened: !node.meta.isOpened } })), [node])

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

  drop(preview(ref))

  return {
    ref,
    handleSelectAdd,
    handleSelectDelete,
    handleSelectExternalLink,
    handleToggleSubTasks,
    handlerId,
    drop,
    drag,
    preview,
  }
}