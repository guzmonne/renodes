import { useCallback, Fragment, forwardRef, createElement } from "react"
import TextareaAutosize from "react-textarea-autosize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faChevronDown, faChevronRight, faDotCircle, faEllipsisV, faExternalLinkAlt, faPencilAlt, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import ReactMarkdown from "react-markdown"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"

import { Loader } from "../Utils/Loader"
import { useHasMounted } from "../../hooks/useHasMounted"
import { useDebounce } from "../../hooks/useDebounce"
import { NodesProvider, useNodesContext } from "../../hooks/useNodesContext"
import { useNode } from "../../hooks/useNode"
import { useInterpreter } from "../../hooks/useInterpreter"
import { ScrollArea } from "../../components/ScrollArea"
import type { Task } from "../../models/task"

declare global {
  interface Window { Prism?: { highlightAll: () => void }; }
}
/**
 * Tasks renders a list of Tasks and tracks its visual mode.
 */
export function Tasks() {
  const {
    tasks,
    query: { isLoading },
  } = useNodesContext()

  if (isLoading) return <div className="Tasks"><Loader /></div>

  return (
    <div className="Tasks">
      {tasks.map((task: Task, index: number) => (
        <Tasks.Task
          key={task.id}
          task={task}
          index={index}
        />
      ))}
      {tasks.length === 0 && <Tasks.Empty />}
    </div>
  )
}
/**
 * TaskProps represent the props of the Task component.
 */
export interface TaskProps {
  /**
   * Task is the task model.
   */
  task: Task;
  /**
   * index marks the position of the task in the list.
   */
  index?: number;
}
/**
 * Tasks.Task is the main `Task` component.
 */
Tasks.Task = ({ task, index }: TaskProps) => {
  const {
    ref,
    handleToggleSubTasks,
    handlerId,
    drag,
  } = useNode(task, index)

  return (
    <Fragment>
      <div className="Task" ref={ref}>
        <div className="Task__Controls">
          <Tasks.TaskControl icon={task.meta.isOpened ? faChevronDown : faChevronRight} onClick={handleToggleSubTasks} ref={drag} data-handler-id={handlerId} />
          <Tasks.Dropdown task={task} index={index} />
        </div>
        <Tasks.Interpreter task={task} index={index} />
      </div>
      {task.meta.isOpened &&
        <NodesProvider branch={task.id}>
          <Tasks />
        </NodesProvider>
      }
    </Fragment>
  )
}
/**
 * Tasks.Empty renders a component that shows an empty textarea that
 * creates new `Tasks`.
 */
Tasks.Empty = () => {
  const { handleAddEmpty } = useNodesContext()
  const handleAdd = useCallback(() => handleAddEmpty(), [handleAddEmpty])

  return (
    <div className="Task">
      <div className="Task__Controls">
        <div className="Task__Control" onClick={handleAdd}>
          <i className="fa fa-plus" aria-hidden="true" />
        </div>
      </div>
      <TextareaAutosize
        className="Interpreter Interpreter__Text"
        name="content"
        defaultValue=""
        onFocusCapture={handleAdd}
      />
    </div>
  )
}
/**
 * TaskControlProps represent the props of the TaskControl component.
 */
export interface TaskControlProps {
  icon: IconDefinition;
  onClick?: () => void;
  className?: string;
}
/**
 * TaskControl is a component that handles a control option of a Task.
 */
Tasks.TaskControl = forwardRef<HTMLDivElement, TaskControlProps>(({ onClick, icon, className, ...props }, ref) => {
  return (
    <div onClick={onClick} className={cn("Task__Control", className)} ref={ref} {...props}>
      <FontAwesomeIcon icon={icon} />
    </div>
  )
})
/**
 * Interpreter is the component used to show the appropiate node
 * interpreter component.
 */
Tasks.Interpreter = function ({ task, ...props }: TaskProps) {
  if (task.meta.isInEditMode) return <Tasks.EditInterpreter task={task} {...props} />
  switch (task.interpreter) {
    case "code":
      return <Tasks.CodeInterpreter task={task} {...props} />
    default:
      return <Tasks.MarkdownInterpreter task={task} {...props} />
  }
}
/**
 * EditInterpreter is the component used to display nodes as text.
 */
Tasks.EditInterpreter = function ({ task, index }: TaskProps) {
  const {
    content,
    hoverClasses,
    handleContentChange,
    handleKeyDown,
    handleEdit,
  } = useInterpreter(task, index)

  useDebounce(() => {
    if (content === task.content) return
    const updatedTask = task.set({ content })
    handleEdit(updatedTask)
  }, 1000, [content])

  return (
    <TextareaAutosize name="content"
      className={cn("Interpreter Interpreter__Text", hoverClasses)}
      value={content}
      onChange={handleContentChange}
      onKeyDown={handleKeyDown}
      autoFocus={true}
    />
  )
}
/**
 * MarkdownInterpreter is the component used to display nodes as markdown.
 */
Tasks.MarkdownInterpreter = function ({ task, index }: TaskProps) {
  const { content, hoverClasses } = useInterpreter(task, index)
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className={cn("Interpreter Interpreter__Markdown", hoverClasses)}>
      <ReactMarkdown children={content} />
    </div>
  )
}
/**
 * CodeInterpreter is the component used to display nodes as code.
 */
Tasks.CodeInterpreter = function ({ task, index }: TaskProps) {
  const { content, hoverClasses } = useInterpreter(task, index)
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className={cn("Interpreter Interpreter__Code", hoverClasses)}>
      <ScrollArea orientation="horizontal">
        <pre className="Interpreter__Code--pre">
          <code className="language-txt" children={content} />
        </pre>
      </ScrollArea>
      <input type="text" defaultValue="" className="Interpreter__Code--language" />
    </div>
  )
}
/**
 * Dropdown is the component used to render the Node dropdown menu
 */
Tasks.Dropdown = function ({ task, index }: TaskProps) {
  const {
    handleEdit,
    handleSelectAdd,
    handleSelectDelete,
    handleSelectExternalLink,
  } = useNode(task, index)

  const handleSetInterpeter = useCallback((interpreter: string) => {
    handleEdit(task.set({ interpreter }))
  }, [task, handleEdit])

  const handleToggleEditMode = useCallback(() => {
    handleEdit(task.set({ meta: { isInEditMode: !task.meta.isInEditMode } }), false)
  }, [task])

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={Tasks.TaskControl} icon={faEllipsisV} />
      <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={5}>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectExternalLink}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faExternalLinkAlt} /></div>
          <div className="DropdownMenu__CenterSlot">Open in new page</div>
          <div className="DropdownMenu__RightSlot"></div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleToggleEditMode}>
          <div className="DropdownMenu__LeftSlot">{task.meta.isInEditMode && <FontAwesomeIcon icon={faCheck} />}</div>
          <div className="DropdownMenu__CenterSlot">Edit</div>
          <div className="DropdownMenu__RightSlot">⌃+s</div>
        </DropdownMenu.Item>
        <DropdownMenu.Root>
          <DropdownMenu.TriggerItem className="DropdownMenu__Item">
            <div className="DropdownMenu__LeftSlot"></div>
            <div className="DropdownMenu__CenterSlot">Interpreter</div>
            <div className="DropdownMenu__RightSlot"><FontAwesomeIcon icon={faChevronRight} /></div>
          </DropdownMenu.TriggerItem>
          <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={2} alignOffset={-5}>
            <DropdownMenu.Label className="DropdownMenu__Label">Interpreter</DropdownMenu.Label>
            <DropdownMenu.RadioGroup className="DropdownMenu__RadioGroup" value={task.interpreter || "text"} onValueChange={handleSetInterpeter}>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="markdown">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={faDotCircle} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Markdown</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="task">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={faDotCircle} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Task</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="code">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={faDotCircle} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Code</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DropdownMenu.Separator className="DropdownMenu__Separator" />
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectAdd}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faPlus} /></div>
          <div className="DropdownMenu__CenterSlot">Add Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Enter</div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item DropdownMenu__Item--red" onSelect={handleSelectDelete}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faTrash} /></div>
          <div className="DropdownMenu__CenterSlot">Delete Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Del</div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}