import { useState, useCallback, useRef, ChangeEvent, KeyboardEvent } from "react"
import { useDrag, useDrop } from "react-dnd"
import TextareaAutosize from "react-textarea-autosize";
import cn from "classnames"

import { Loader } from "../utils/Loader"
import { useDebounce } from "../../hooks/useDebounce"
import { Task } from "../../models/task"
import { useTasksQuery } from "../../hooks/useTasksQuery";

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
  initialData?: Task[];
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
    isLoading,
    handleAddEmpty,
    handleAdd,
    handleEdit,
    handleDelete,
    dragTaskMutation,
  } = useTasksQuery(branch, initialData)

  const TaskComponent = taskComponent

  if (isLoading) return <div style={{ margin: "0 auto" }}><Loader /></div>

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
   */
  onAdd: (task: Task) => void;
  /**
   * onEdit is a function that passes updates on a task to a parent
   * component.
   */
  onEdit?: (task: Task) => void;
  /**
   * onDelete is a function that passes a task deletion ot its parent.
   */
  onDelete?: (task: Task) => void;
  /**
   * onDrag will be called when a Task gets dragged.
   */
  onDrag?: (dragIndex: number, hoverIndex: number) => void;
  /**
   * onDragEnd will be called whene the dragin motion is stopped.
   */
  onDragEnd?: (dragIndex: number, hoverIndex: number) => void;
  /**
   * hoverTop is a flag that it's set when another `Task` from the bottom
   * is being hoverd on top of this `Task`.
   */
  hoverTop?: boolean;
  /**
   * hoverBottom is a flag that it's set when another `Task` from the top
   * is being hoverd on top of this `Task`.
   */
  hoverBottom?: boolean;
}
/**
 * Tasks.Task is the main `Task` component.
 */
Tasks.Task = ({ task, index, onAdd, onEdit, onDrag, onDragEnd, hoverBottom, hoverTop }: TaskProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isShowingSubTasks, setIsShowingSubTasks] = useState<boolean>(false)
  const [content, setContent] = useState(task.content)
  const [isAnimated, setIsAnimated] = useState(false)
  const handleSubmit = useCallback((e) => e.preventDefault(), [])

  const [{ handlerId }, drop] = useDrop({
    accept: "TASK",
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
    type: "TASK",
    item: () => ({ id: task.id, dragIndex: index }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => onDragEnd(item.dragIndex, item.hoverIndex)
  })

  useDebounce(() => {
    setIsAnimated(false)
    if (content === task.content) return
    onEdit(task.set({ content }))
  }, 500, [task, content])

  drop(preview(ref))

  return (
    <div className="Task padding-left" ref={ref}>
      <div className={"flex row justify-content-space-between"}>
        <div onClick={handleToggleSubTasks} className="control">
          {isShowingSubTasks
            ? <i className="fa fa-chevron-down" aria-hidden="true" />
            : <i className="fa fa-chevron-right" aria-hidden="true" />}
        </div>
        <div className="control" ref={drag} data-handler-id={handlerId}>
          <i className="fa fa-grip-vertical" aria-hidden="true" />
        </div>
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
      {isShowingSubTasks && <Tasks branch={task.id} />}
    </div>
  )
  /**
   * handleToggleSubTasks toggles showing or hiding sub-tasks.
   */
  function handleToggleSubTasks() {
    setIsShowingSubTasks(!isShowingSubTasks)
  }
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
    if (e.key !== "Enter" || !e.shiftKey) return
    e.preventDefault()
    onAdd(task)
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
    <div className="Task padding-left">
      <div className="flex row justify-content-space-between">
        <div className="control transparent">
          <i className="fa fa-chevron-right" aria-hidden="true" />
        </div>
        <div className="control" onClick={handleAdd}>
          <i className="fa fa-plus" aria-hidden="true" />
        </div>
        <form onSubmit={handleSubmit}>
          <TextareaAutosize name="content"
            defaultValue=""
            onFocusCapture={handleAdd}
          />
        </form>
      </div>
    </div>
  )
}