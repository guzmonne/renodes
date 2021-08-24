import { Fragment, useCallback } from "react"

import { useDrag } from "../../hooks/useDrag"
import { useNodesContext } from "../../hooks/useNodesContext"
import { NodeControl } from "./NodeControl"
import { NodeDropdown } from "./NodeDropdown"
import { NodeInterpreter } from "./NodeInterpreter"
import type { Node, NodeMeta } from "../../models/node"

/**
 * NodeProps represent the Node Compponent props.
 */
export interface NodeProps {
  /**
   * id corresponds to the unique identifier of a Node.
   */
  id: string;
  /**
   * index represents the current index of the Node's inside its parent collection.
   */
  index?: number;
}
/**
 * NodeComponentProps represent the props of the NodeComponent Component.
 */
export interface NodeComponentProps {
  /**
   * node is the node to be displayed.
   */
  node: Node
  /**
   * index represents the current index of the Node's inside its parent collection.
   */
  index?: number;
  /**
   * onToggleNode toggles an update on the Node's isOpened flag.
   */
  onToggleNode: (meta: NodeMeta) => void;
  /**
   * isRoot is a flag that indicates wether tha Node is the current root Node.
   */
  isRoot?: boolean;
}
/**
 * Node is the control components that configures the presentational
 * component of the Node.
 */
export function Node({ id, index }) {
  const { getNode, onMeta, rootId } = useNodesContext()
  /**
   * onToggleNode toggles an update on the Node's isOpened flag.
   * @param meta - The metadata update object.
   */
  const onToggleNode = useCallback((meta: NodeMeta) => onMeta(id, meta), [id, onMeta])

  const node = getNode(id)

  if (!node) return null

  return <NodeComponent
    node={node}
    index={index || -1}
    onToggleNode={onToggleNode}
    isRoot={node.id === rootId}
  />
}

export function NodeComponent({ node, index, onToggleNode, isRoot }: NodeComponentProps) {
  const { onAdd, onDelete, onMeta, onEdit } = useNodesContext()
  const { drag, handlerId } = useDrag(node, index)
  /**
   * handleToggleNodes toggles an update on the Node's isOpened flag.
   */
  const handleToggleNode = useCallback(() => {
    onToggleNode({ isOpened: !node.meta.isOpened })
  }, [node, onToggleNode])
  /**
   * handleAdd adds a new Node to its collection if the Node is the root, or a Node
   * after itself.
   */
  const handleAdd = useCallback(() => {
    if (isRoot) {
      onAdd(node.id)
    } else {
      onAdd(node.parent, node.id)
    }
  }, [isRoot, onAdd, node])
  /**
   * handleDelete deletes the current Node
   */
  const handleDelete = useCallback(() => {
    onDelete(node.id)
  }, [onDelete, node])
  /**
   * handleIsInEditMode toggles the value of the Node's isInEditMode flag.
   */
  const handleIsInEditMode = useCallback(() => {
    onMeta(node.id, { isInEditMode: !node.meta.isInEditMode }, false)
  }, [onMeta, node])
  /**
   * handleInterpreter edits the value of the Node's interpreter.
   * @param interpreter - New interpreter value
   */
  const handleInterpreter = useCallback((interpreter: string) => {
    onEdit(node.id, { interpreter })
  }, [onEdit, node])
  /**
   * handleExternalLink opens a new page with this Node as root.
   */
  const handleExternalLink = useCallback(() => {
    window.open(window.location.origin + "/" + node.id)
  }, [node])

  return (
    <Fragment>
      <div className="Node">
        <div className="Node__Controls">
          {!isRoot &&
            <NodeControl
              icon={node.meta.isOpened ? "fa-chevron-down" : "fa-chevron-right"}
              onClick={handleToggleNode}
              ref={drag}
              data-handler-id={handlerId}
            />
          }
          <NodeDropdown
            onAdd={handleAdd}
            onDelete={handleDelete}
            noExternalLink={isRoot}
            onExternalLink={handleExternalLink}
            isInEditMode={node.meta.isInEditMode}
            onEdit={handleIsInEditMode}
            interpreter={node.interpreter}
            onInterpreter={handleInterpreter}
          />
        </div>
        <NodeInterpreter />
      </div>
    </Fragment>
  )
}