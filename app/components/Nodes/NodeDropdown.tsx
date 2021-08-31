import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

import { NodeControl } from "./NodeControl"
/**
 * VOID is a placeholder function that does nothing.
 */
const VOID = () => { }
/**
 * NodeDropdown represent the props of the NodeDropdown component.
 */
export interface NodeDropdown {
  /**
   * Flag that indicates wether the external link option should be available.
   */
  noExternalLink?: boolean;
  /**
   * onExternalLink is the callback called when the external link action is triggered.
   */
  onExternalLink?: () => void;
  /**
   * onDelete is the callback called when the delete action is triggered.
   */
  onDelete?: () => void;
  /**
   * onAdd is the callback called when the add action is triggered.
   */
  onAdd?: () => void;
  /**
   * interpreter correspond to the current value of the Node's interpreter.
   */
  interpreter?: string;
  /**
   * onInterpreter is the callback called when the interpreter action is triggered.
   */
  onInterpreter?: (interpreter: string) => void;
  /**
   * isInEditMode is a flag used to track if the Node is in edit mode or not.
   */
  isInEditMode?: boolean;
  /**
   * onEdit is the callback called when the edit action is triggered.
   */
  onEdit?: () => void;
}
/**
 * NodeDropdown is the presentational component of the NodeDropdown component.
 */
export function NodeDropdown({
  noExternalLink = false,
  onExternalLink,
  onDelete,
  onAdd,
  interpreter,
  onInterpreter,
  isInEditMode = false,
  onEdit
}: NodeDropdown) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={NodeControl} icon="ellipsis-v" />
      <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={5}>
        {!noExternalLink &&
          <DropdownMenu.Item className="DropdownMenu__Item" onSelect={onExternalLink ? onExternalLink : VOID}>
            <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={["fas", "external-link"]} /></div>
            <div className="DropdownMenu__CenterSlot">Open in new page</div>
            <div className="DropdownMenu__RightSlot"></div>
          </DropdownMenu.Item>
        }
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={onEdit ? onEdit : VOID}>
          <div className="DropdownMenu__LeftSlot">{isInEditMode ? <FontAwesomeIcon icon={["fas", "save"]} /> : <FontAwesomeIcon icon={["fas", "pencil"]} />}</div>
          <div className="DropdownMenu__CenterSlot">{isInEditMode ? "Save" : "Edit"}</div>
          <div className="DropdownMenu__RightSlot">{isInEditMode && "⌃+s"}</div>
        </DropdownMenu.Item>
        <DropdownMenu.Root>
          <DropdownMenu.TriggerItem className="DropdownMenu__Item">
            <div className="DropdownMenu__LeftSlot"></div>
            <div className="DropdownMenu__CenterSlot">Interpreter</div>
            <div className="DropdownMenu__RightSlot"><FontAwesomeIcon icon={["fas", "chevron-right"]} /></div>
          </DropdownMenu.TriggerItem>
          <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={2} alignOffset={-5}>
            <DropdownMenu.Label className="DropdownMenu__Label">Interpreter</DropdownMenu.Label>
            <DropdownMenu.RadioGroup className="DropdownMenu__RadioGroup" value={interpreter || "markdown"} onValueChange={onInterpreter ? onInterpreter : VOID}>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="markdown">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={["fas", "check"]} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Markdown</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="task">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={["fas", "check"]} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Task</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="code">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={["fas", "check"]} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Code</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DropdownMenu.Separator className="DropdownMenu__Separator" />
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={onAdd ? onAdd : VOID}>
          <div className="DropdownMenu__LeftSlot"> <FontAwesomeIcon icon={["fas", "plus"]} /></div>
          <div className="DropdownMenu__CenterSlot">Add Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Enter</div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item DropdownMenu__Item--red" onSelect={onDelete ? onDelete : VOID}>
          <div className="DropdownMenu__LeftSlot"> <FontAwesomeIcon icon={["fas", "trash"]} /></div>
          <div className="DropdownMenu__CenterSlot">Delete Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Del</div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}