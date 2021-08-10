import { useCallback, Fragment, forwardRef } from "react"
import TextareaAutosize from "react-textarea-autosize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronRight, faEllipsisV, faExternalLinkAlt, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"

import { Loader } from "../Utils/Loader"
import { Task } from "../../models/task"
import { NodesProvider, useNodesContext } from "../../hooks/useNodesContext"
import { useNode } from "../../hooks/useNode"

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
    content,
    handleSubmit,
    handleSelectAdd,
    handleSelectDelete,
    handleSelectExternalLink,
    handleToggleSubTasks,
    handleContentChange,
    handleKeyDown,
    handlerId,
    textAreaClasses,
    drag,
  } = useNode(task, index)

  return (
    <Fragment>
      <div className="Task" ref={ref}>
        <Tasks.TaskControl icon={task.meta.isOpened ? faChevronDown : faChevronRight} onClick={handleToggleSubTasks} ref={drag} data-handler-id={handlerId} />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger as={Tasks.TaskControl} icon={faEllipsisV} />
          <DropdownMenu.Content className="DropdownMenu__Content">
            <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectExternalLink}>
              <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faExternalLinkAlt} /></div>
              <div className="DropdownMenu__CenterSlot">Open in new page</div>
              <div className="DropdownMenu__RightSlot"></div>
            </DropdownMenu.Item>
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
        <form onSubmit={handleSubmit}>
          <TextareaAutosize name="content"
            className={textAreaClasses}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            autoFocus={true}
          />
        </form>
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