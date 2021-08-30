import { Fragment, useCallback } from "react"
import cn from "classnames"

import { useDrag } from "../../hooks/useDrag"
import { useNodesContext } from "../../hooks/useNodesContext"
import { NodeControl } from "./NodeControl"
import { NodeDropdown } from "./NodeDropdown"
import { NodeInterpreter } from "./NodeInterpreter"
import { NodeAddChild } from "./NodeAddChild"
import type { Node as NodeModel } from "../../models/node"
import { useNode } from "../../hooks/useNode"

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
  node: NodeModel
  /**
   * index represents the current index of the Node's inside its parent collection.
   */
  index?: number;
  /**
   * isRoot is a flag that indicates wether tha Node is the current root Node.
   */
  isRoot?: boolean;
  /**
   * onToggleNode toggles an update on the Node's isOpened flag.
   * @param meta - The metadata update object.
  */
  onToggleNode: () => void;
  /**
   * onAddChild adds a new Node as a child of the current Node.
   */
  onAddChild: () => void;
  /**
   * onAddSibling adds a new Node as a sibling of the current Node.
   */
  onAddSibling: () => void;
  /**
   * onDelete deletes the current Node
   */
  onDelete: () => void;
  /**
   * onToggleEditMode toggles the value of the Node's isInEditMode flag.
   */
  onToggleEditMode: () => void;
  /**
   * onEditInterpreter edits the value of the Node's interpreter.
   * @param interpreter - New interpreter value
   */
  onEditInterpreter: (interpreter: string) => void;
  /**
   * onEditContent edits the value of the Node's content.
   * @param content - New content value
   */
  onEditContent: (content: string) => void;
  /**
   * onSave updates the content and sets the value of isInEditMode to false
   * @param content - New content value
   */
  onSave: (content: string) => void;
  /**
   * onOpenExternalLink opens a new page with this Node as root.
   */
  onOpenExternalLink: () => void;
}
/**
 * Node is the control components that configures the presentational
 * component of the Node.
 */
export function Node({ id, index }: NodeProps) {
  const { onAdd, onDelete, onMeta, onEdit, fetchNode, rootId } = useNodesContext()
  const node = useNode(id)
  /**
   * handleToggle toggles an update on the Node's isOpened flag.
   * @param meta - The metadata update object.
  */
  const handleToggle = useCallback(() => {
    onMeta(node.id, { isOpened: !node.meta.isOpened })
    fetchNode(node.id)
  }, [onMeta, node])
  /**
   * handleAddChild adds a new Node as a child of the current Node.
   */
  const handleAddChild = useCallback(() => { onAdd(node.id) }, [onAdd, node])
  /**
   * handleAddSibling adds a new Node as a sibling of the current Node.
   */
  const handleAddSibling = useCallback(() => { onAdd(node.parent, node.id) }, [onAdd, node])
  /**
   * handleDelete deletes the current Node
   */
  const handleDelete = useCallback(() => {
    onDelete(node.id)
  }, [onDelete, node])
  /**
   * handleToggleEditMode toggles the value of the Node's isInEditMode flag.
   */
  const handleToggleEditMode = useCallback(() => {
    onMeta(node.id, { isInEditMode: !node.meta.isInEditMode }, false)
  }, [onMeta, node])
  /**
   * handleInterpreterChange edits the value of the Node's interpreter.
   * @param interpreter - New interpreter value
   */
  const handleInterpreterChange = useCallback((interpreter: string) => {
    onEdit(node.id, { interpreter })
  }, [onEdit, node])
  /**
   * handleContentChange edits the value of the Node's content.
   * @param content - New content value
   */
  const handleContentChange = useCallback((content: string) => {
    onEdit(node.id, { content })
  }, [onEdit, node])
  /**
   * handleSave updates the content and sets the value of isInEditMode to false
   * @param content - New content value
   */
  const handleSave = useCallback((content: string) => {
    onEdit(node.id, { content })
    onMeta(node.id, { isInEditMode: false })
  }, [onEdit, onMeta, node])
  /**
   * handleExternalLink opens a new page with this Node as root.
   */
  const handleExternalLink = useCallback(() => {
    window.open(window.location.origin + "/" + node.id)
  }, [node])

  if (!node) return null

  return <NodeComponent
    node={node}
    index={index === undefined ? -1 : index}
    isRoot={id === rootId}
    onAddChild={handleAddChild}
    onAddSibling={handleAddSibling}
    onToggleNode={handleToggle}
    onDelete={handleDelete}
    onToggleEditMode={handleToggleEditMode}
    onEditInterpreter={handleInterpreterChange}
    onEditContent={handleContentChange}
    onSave={handleSave}
    onOpenExternalLink={handleExternalLink}
  />
}

export function NodeComponent({
  node,
  index,
  isRoot,
  onAddChild,
  onAddSibling,
  onDelete,
  onEditContent,
  onEditInterpreter,
  onOpenExternalLink,
  onSave,
  onToggleEditMode,
  onToggleNode,
}: NodeComponentProps) {
  const { drag, handlerId, hoverClasses } = useDrag(node, index)

  return (
    <Fragment>
      {node.id !== "home" &&
        <div className={cn("Node", hoverClasses)}>
          <div className="Node__Controls">
            <NodeControl
              icon={node.meta.isOpened ? "chevron-down" : "chevron-right"}
              onClick={onToggleNode}
              ref={drag}
              data-handler-id={handlerId}
            />
            <NodeDropdown
              onAdd={onAddSibling}
              onDelete={onDelete}
              noExternalLink={isRoot}
              onExternalLink={onOpenExternalLink}
              isInEditMode={node.meta.isInEditMode}
              onEdit={onToggleEditMode}
              interpreter={node.interpreter}
              onInterpreter={onEditInterpreter}
            />
          </div>
          <NodeInterpreter
            isInEditMode={node.meta.isInEditMode}
            interpreter={node.interpreter}
            content={node.content}
            onAdd={onAddSibling}
            onDelete={onDelete}
            onChange={onEditContent}
            onSave={onSave}
          />
        </div>
      }
      <div className="Nodes" key={node.meta.isOpened ? "chevron-down" : "chevron-right"}>
        {(isRoot || node.meta.isOpened) && node.collection.length === 0
          ? <NodeAddChild onAdd={onAddChild} />
          : node.collection.map((id, index) => (
            <Node key={id} id={id} index={index} />
          ))
        }
      </div>
    </Fragment >
  )
}
/**
 * Functions
 */
/**
 * ParsedContent represents a deserialized content string.
 */
export interface ParsedContent {
  /**
   * content is the actual content of the string.
   */
  content: string;
  /**
   * meta represents aditional metadata related to the content.
   */
  meta?: { [key: string]: any };
}
/**
 * parse parses a content string and converts it into a ParsedContent object.
 * @param content - Content string to parse.
 * @param defaultValue - Default value to return in case the content string parse errors.
 */
function parse<ExtendedParsedContent extends ParsedContent>(content: string, defaultValue: ExtendedParsedContent): ExtendedParsedContent {
  let parsed: ExtendedParsedContent
  try {
    parsed = JSON.parse(content)
    parsed.content = parsed.content || content
    parsed.meta = parsed.meta || defaultValue.meta
  } catch (err) {
    parsed = { ...defaultValue, content }
  }
  return parsed
}