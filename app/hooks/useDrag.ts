import { useRef, useState, useEffect } from "react"
import { useDrag as useReactDndDrag, useDrop } from "react-dnd"
import cn from "classnames"

import { useNodesContext } from "./useNodesContext"
import type { Task } from "../models/task"

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

export function useDrag(node: Task, index: number) {
  const ref = useRef<any>(null)
  const { hoverIndex, dragIndex, handleDrag, handleDragEnd } = useNodesContext()
  const [hoverClasses, setHoverClasses] = useState("")

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

  const [_, drag, preview] = useReactDndDrag({
    type: node.branch || "TASK",
    item: () => ({ id: node.id, dragIndex: index, type: node.branch || "TASK" }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => handleDragEnd(item.dragIndex, item.hoverIndex)
  })

  drop(preview(ref))

  useEffect(() => setHoverClasses(cn({
    hoverTop: hoverIndex === index && dragIndex > index,
    hoverBottom: hoverIndex === index && dragIndex < index
  })), [index, hoverIndex, dragIndex])

  return {
    drag,
    drop,
    handlerId,
    preview,
    ref,
    hoverClasses,
  }
}