import { useCallback, Fragment, forwardRef } from "react"
import TextareaAutosize from "react-textarea-autosize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronRight, faDotCircle, faEllipsisV, faExternalLinkAlt, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import ReactMarkdown from "react-markdown"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"

import { Loader } from "../Utils/Loader"
import { Task } from "../../models/task"
import { useDebounce } from "../../hooks/useDebounce"
import { NodesProvider, useNodesContext } from "../../hooks/useNodesContext"
import { useNode } from "../../hooks/useNode"
import { useInterpreter } from "../../hooks/useInterpreter"

/**
 * Tasks renders a list of Tasks and tracks its visual mode.
 */
export function Tasks() {
  const {
    tasks,
    query,
  } = useNodesContext()

  if (query.isLoading) return <div className="Tasks"><Loader /></div>

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
        <Tasks.TaskControl icon={task.meta.isOpened ? faChevronDown : faChevronRight} onClick={handleToggleSubTasks} ref={drag} data-handler-id={handlerId} />
        <Tasks.Dropdown task={task} index={index} />
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
  const handleSubmit = useCallback((e) => e.preventDefault(), [])

  return (
    <div className="Task">
      <div className="Task__Control Task__Control--transparent">
        <i className="fa fa-chevron-right" aria-hidden="true" />
      </div>
      <div className="Task__Control" onClick={handleAdd}>
        <i className="fa fa-plus" aria-hidden="true" />
      </div>
      <form onSubmit={handleSubmit}>
        <TextareaAutosize name="content"
          defaultValue=""
          onFocusCapture={handleAdd}
        />
      </form>
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
  switch (task.interpreter) {
    case "markdown":
      return <Tasks.MarkdownInterpreter task={task} {...props} />
    case "text":
    default:
      return <Tasks.TextInterpreter task={task} {...props} />
  }
}
/**
 * TextInterpreter is the component used to display nodes as text.
 */
Tasks.TextInterpreter = function ({ task, index }: TaskProps) {
  const {
    content,
    hoverClasses,
    handleSubmit,
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
    <form onSubmit={handleSubmit} className="Interpreter Interpreter__Text">
      <TextareaAutosize name="content"
        className={cn("Interpreter__Text--textarea", hoverClasses)}
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        autoFocus={true}
      />
    </form>
  )
}
/**
 * MarkdownInterpreter is the component used to display nodes as markdown.
 */
Tasks.MarkdownInterpreter = function ({ task, index }: TaskProps) {
  const { content } = useInterpreter(task, index)

  return (
    <div className="Interpreter Interpreter__Markdown">
      <ReactMarkdown>{content}</ReactMarkdown>
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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={Tasks.TaskControl} icon={faEllipsisV} />
      <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={5}>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectExternalLink}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faExternalLinkAlt} /></div>
          <div className="DropdownMenu__CenterSlot">Open in new page</div>
          <div className="DropdownMenu__RightSlot"></div>
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
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="text">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <FontAwesomeIcon icon={faDotCircle} />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Text</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
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
          <div className="DropdownMenu__CenterSlot">Add Task</div>
          <div className="DropdownMenu__RightSlot">⇧+Enter</div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item DropdownMenu__Item--red" onSelect={handleSelectDelete}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faTrash} /></div>
          <div className="DropdownMenu__CenterSlot">Delete Task</div>
          <div className="DropdownMenu__RightSlot">⇧+Del</div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}