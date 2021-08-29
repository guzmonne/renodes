import { useState, useRef, useCallback, useEffect } from "react";
import { useDrag as useReactDndDrag, useDrop } from "react-dnd"
import cn from "classnames"

import { useNodesContext } from "./useNodesContext"
import type { Node } from "../models/node"
/**
 * NodeDrag is the interface React DND uses to handle dragging a Node.
 */
export interface NodeDrag {
  /**
   * dragIndex corresponds to the index of the `Nodes` being dragged.
   */
  dragIndex: number;
  /**
   * hoverIndex corresponds to the index of the `Nodes` that is being hovered.
   */
  hoverIndex: number;
  /**
   * id is the unique identifier of the task.
   */
  id: string
  /**
   * type indicates the type of the Node being dragged.
   */
  type: string
}
export function useDrag(node: Node, index: number) {
  const ref = useRef<any>(null)
  const [[dragIndex, hoverIndex], setIndexes] = useState<number[]>([])
  const { onDrag } = useNodesContext()
  const [hoverClasses, setHoverClasses] = useState("")
  /**
   * onDragPreview updates the handle and drag indexes values.
   * @poram newDragIndex - The new drag index.
   * @param newHoverIndex - The new hover index.
   */
  const onDragPreview = useCallback((newDragIndex: number, newHoverIndex: number) => (
    setIndexes([newDragIndex, newHoverIndex])
  ), [setIndexes])
  /**
   * onDragEnd is called when a drag action is done.
   * @param dragIndex - The last dragIndex value.
   * @param hoverIndex - The last hoverIndex value.
   */
  const onDragEnd = useCallback((dragIndex: number, hoverIndex: number) => {
    setIndexes([])
    if (dragIndex === hoverIndex) return
    onDrag(node.parent, dragIndex, hoverIndex)
  }, [setIndexes, onDrag])
  // Set up the drop logic.
  const [{ handlerId }, drop] = useDrop({
    accept: node.parent || "NODE",
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item: NodeDrag) => {
      if (!ref.current || index === -1) return
      const { dragIndex, hoverIndex } = item
      if (hoverIndex === index) return
      item.hoverIndex = index
      onDrag(node.parent, dragIndex, index)
    }
  })
  // Set up the drag logic
  const [_, drag, preview] = useReactDndDrag({
    type: node.parent || "TASK",
    item: () => ({ id: node.id, dragIndex: index, type: node.parent || "NODE" }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => onDragEnd(item.dragIndex, item.hoverIndex)
  })
  // Set up the hover classes
  useEffect(() => setHoverClasses(cn({
    hoverTop: hoverIndex === index && dragIndex > index,
    hoverBottom: hoverIndex === index && dragIndex < index
  })), [index, hoverIndex, dragIndex])
  // Combine the drop and preview values with our ref.
  drop(preview(ref))
  // ---
  return {
    drag,
    drop,
    handlerId,
    hoverClasses,
    onDragPreview,
    onDragEnd,
    preview,
    ref,
  }
}