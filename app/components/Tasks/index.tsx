import { useState, useEffect, useCallback, useRef, ChangeEvent, KeyboardEvent, Fragment, forwardRef } from "react"
import { useDrag, useDrop } from "react-dnd"
import TextareaAutosize from "react-textarea-autosize";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronRight, faEllipsisV, faExternalLinkAlt, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"

import { Loader } from "../Utils/Loader"
import { useDebounce } from "../../hooks/useDebounce"
import { Task } from "../../models/task"
import { useTasksQuery } from "../../hooks/useTasksQuery";
import type { TaskBody } from "../../models/task"

/**
 * TasksProps represent the `props` of the Tasks component.
 */
export interface TasksProps {
  /**
   * branch represents the `Tasks` current branch.
   */
  branch: string;
  /**
   * initialData is a list of Task that should initialize the
   * React-Query cache.
   */
  initialData?: TaskBody[];
  /**
   * taskComponent can be used to override the default Task Component.
   */
  taskComponent?: (props: TaskProps) => JSX.Element;
}
/**
 * Tasks renders a list of Tasks and tracks its visual mode.
 */
export function Tasks({ branch, initialData, taskComponent = Tasks.Task }: TasksProps) {
  const [[dragIndex, hoverIndex], setIndexes] = useState<number[]>([])
  const {
    tasks,
    query,
    handleAddEmpty,
    handleAdd,
    handleEdit,
    handleDelete,
    handleMeta,
    dragTaskMutation,
  } = useTasksQuery(branch, initialData)

  const TaskComponent = taskComponent

  if (query.isLoading) return <div className="Tasks"><Loader /></div>

  return (
    <div className="Tasks">
      {tasks.map((task: Task, index: number) => (
        <TaskComponent
          key={task.id}
          task={task}
          index={index}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleMeta}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          hoverTop={hoverIndex === index && dragIndex > index}
          hoverBottom={hoverIndex === index && dragIndex < index}
        />
      ))}
      {tasks.length === 0 && <Tasks.Empty onAdd={handleAddEmpty} />}
    </div>
  )
  /**
   * onDrag handles dragging a task.
   */
  function onDrag(newDragIndex: number, newHoverIndex: number) {
    setIndexes([newDragIndex, newHoverIndex])
  }
  /**
   * onDragEnd calls the `Tasks` API to update the `Task` position
   * @param index - New index of the `Task`.
   */
  function onDragEnd(dragIndex: number, hoverIndex: number) {
    setIndexes([])
    if (dragIndex === hoverIndex) return
    dragTaskMutation.mutate({ dragIndex, hoverIndex })
  }
}
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
  /**
   * onAdd is a function that creates an empty new `Task` under the
   * current one.
   * @param task - Task to be added.
   */
  onAdd?: (task: Task) => void;
  /**
   * onEdit is a function that passes updates on a task to a parent
   * component.
   * @param task - Task to be deleted.
   */
  onEdit?: (task: Task) => void;
  /**
   * onDelete is a function that passes a task deletion ot its parent.
   * @param task - Task to be deleted.
   */
  onDelete?: (task: Task) => void;
  /**
   * onToggle toggles the `isOpened` status of a `Task`.
   * @param task - Task whose `isOpened` flag should be toggled.
   */
  onToggle?: (task: Task) => void;
  /**
   * onDrag will be called when a Task gets dragged.
   * @param dragIndex - Index of the Task being dragged.
   * @param hoverIndex - Index of the Task being hovered.
   */
  onDrag?: (dragIndex: number, hoverIndex: number) => void;
  /**
   * onDragEnd will be called whene the dragin motion is stopped.
   * @param dragIndex - Index of the Task being dragged.
   * @param hoverIndex - Index of the Task being hovered.
   */
  onDragEnd?: (dragIndex: number, hoverIndex: number) => void;
  /**
   * hoverTop is a flag that it"s set when another `Task` from the bottom
   * is being hoverd on top of this `Task`.
   */
  hoverTop?: boolean;
  /**
   * hoverBottom is a flag that it"s set when another `Task` from the top
   * is being hoverd on top of this `Task`.
   */
  hoverBottom?: boolean;
}
/**
 * Tasks.Task is the main `Task` component.
 */
Tasks.Task = ({ task, index, onAdd, onEdit, onDelete, onToggle, onDrag, onDragEnd, hoverBottom, hoverTop }: TaskProps) => {
  const ref = useRef<any>(null)
  const [content, setContent] = useState(task.content)
  const [isAnimated, setIsAnimated] = useState(false)
  const handleSubmit = useCallback((e) => e.preventDefault(), [])
  const handleSelectAdd = useCallback(() => onAdd(task), [onAdd, task])
  const handleSelectDelete = useCallback(() => onDelete(task), [onDelete, task])
  const handleSelectExternalLink = useCallback(() => window.open(window.location.origin + "/" + task.id), [task])
  const handleToggleSubTasks = useCallback(() => onToggle(task.set({ meta: { isOpened: !task.meta.isOpened } })), [task])

  useEffect(() => setContent(task.content), [task.content])

  const [{ handlerId }, drop] = useDrop({
    accept: task.branch || "TASK",
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item: TaskDrag) => {
      if (!onDrag || !ref.current || index === undefined) return
      const { dragIndex, hoverIndex } = item
      if (hoverIndex === index) return
      item.hoverIndex = index
      onDrag(dragIndex, index)
    }
  })

  const [_, drag, preview] = useDrag({
    type: task.branch || "TASK",
    item: () => ({ id: task.id, dragIndex: index, type: task.branch || "TASK" }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => onDragEnd(item.dragIndex, item.hoverIndex)
  })

  useDebounce(() => {
    setIsAnimated(false)
    if (content === task.content) return
    const updatedTask = task.set({ content })
    onEdit(updatedTask)
  }, 1000, [content])

  drop(preview(ref))

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
            className={cn({ animated: isAnimated, hoverBottom, hoverTop })}
            value={content}
            onChange={handlecontentChange}
            onKeyDown={handleShiftKey}
            autoFocus={true}
          />
        </form>
      </div>
      {task.meta.isOpened && <Tasks branch={task.id} />}
    </Fragment>
  )
  /**
   * handlecontentChange updates the value of the content.
   * @param e - React `onChange` event.
   */
  function handlecontentChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setIsAnimated(true)
    setContent(e.currentTarget.value)
  }
  /**
   * handleShiftKey creates adds a new `Task` when the Shift+Enter
   * keys are pressed.
   */
  function handleShiftKey(e: KeyboardEvent) {
    if (!e.shiftKey) return
    switch (e.key) {
      case "Enter": { e.preventDefault(); handleSelectAdd(); break }
      case "Delete": { e.preventDefault(); handleSelectDelete(); break }
    }
  }
}
/**
 * EmptyTaskProps represent the props for the Empty component.
 */
interface EmptyTaskProps {
  /**
   * onAdd adds a new empty `Task`.
   */
  onAdd: () => void;
}
/**
 * Tasks.Empty renders a component that shows an empty textarea that
 * creates new `Tasks`.
 */
Tasks.Empty = ({ onAdd }: EmptyTaskProps) => {
  const handleAdd = useCallback(() => onAdd(), [onAdd])
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