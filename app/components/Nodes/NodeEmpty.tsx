import TextareaAutosize from "react-textarea-autosize";

import { NodeControl } from "./NodeControl"

/**
 * NodeEmptyProps represnts the props of the NodeEmpty component.
 */
export interface NodeEmptyProps {
  /**
   * onAdd is the callback used to create a new Node.
   */
  onAdd: () => void;
}
/**
 * NodeEmpty renders an empty Node, capable of creating new ones.
 */
export function NodeEmpty({ onAdd }: NodeEmptyProps) {
  return (
    <div className="Node">
      <div className="Node__Controls">
        <NodeControl icon="fa-plus" onClick={onAdd} />
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