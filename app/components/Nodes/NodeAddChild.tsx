import TextareaAutosize from "react-textarea-autosize";

import { NodeControl } from "./NodeControl"

/**
 * NodeAddChildProps represnts the props of the NodeAddChild component.
 */
export interface NodeAddChildProps {
  /**
   * onAdd is the callback used to create a new Node.
   */
  onAdd: () => void;
}
/**
 * NodeAddChild renders an empty Node, capable of creating new ones.
 */
export function NodeAddChild({ onAdd }: NodeAddChildProps) {
  return (
    <div className="Node">
      <div className="Node__Controls">
        <NodeControl icon="plus" onClick={onAdd} />
      </div>
      <TextareaAutosize
        className="Interpreter Interpreter__Text"
        name="content"
        defaultValue=""
        onFocusCapture={onAdd}
      />
    </div>
  )
}