import { useState, useCallback, useRef, ChangeEvent } from "react"
import { useQueryClient, useQuery, useMutation } from "react-query"
import { ulid } from "ulid"
import { useDrag, useDrop } from "react-dnd"
import { DndProvider } from 'react-dnd-multi-backend';
import HTML5toTouch from 'react-dnd-multi-backend/dist/cjs/HTML5toTouch';
import TextareaAutosize from "react-textarea-autosize";
import cn from "classnames"

import { Loader } from "../utils/Loader"
import { useDebounce } from "../../hooks/useDebounce"
import { Task } from "../../models/task"
import { useTasksQuery } from "../../hooks/useTasksQuery";

/**
 * WHITESPACE_REGEX is a regular expression that matches all whitespaces
 * of a string.
 */
const WHITESPACE_REGEX = /[\u0000-\u001F\u007F-\u009F]/g
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
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    dragTaskMutation,
  } = useTasksQuery(branch, initialData)

  const TaskComponent = taskComponent

  if (isLoading) return <div style={{ margin: "0 auto" }}><Loader /></div>

  return (
    <DndProvider options={HTML5toTouch}>
      <div className="Tasks">
        {tasks.map((task: Task, index: number) => (
          <TaskComponent
            key={task.id}
            task={task}
            index={index}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            hoverTop={hoverIndex === index && dragIndex > index}
            hoverBottom={hoverIndex === index && dragIndex < index}
          />
        ))}
        <Tasks.Empty onAdd={handleAdd} />
      </div>
    </DndProvider>
  )
  /**
   * handleAdd handles the creation of new `Tasks`.
   * @param task - Task to add to the list.
   */
  function handleAdd() {
    const task = new Task({ id: ulid(), branch, content: "" })
    createTaskMutation.mutate(task)
  }
  /**
   * handleDelete allows a Child component to remove a task from the list.
   */
  function handleDelete(task: Task) {
    deleteTaskMutation.mutate(task)
  }
  /**
   * handleEdit handles `Task` updated.
   */
  function handleEdit(task: Task) {
    updateTaskMutation.mutate(task)
  }
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
interface TaskDrag {
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
Tasks.Task = ({ task, index, onEdit, onDrag, onDragEnd, hoverBottom, hoverTop }: TaskProps) => {
  const [isShowingSubTasks, setIsShowingSubTasks] = useState<boolean>(false)
  const ref = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(task.content)
  const [isAnimated, setIsAnimated] = useState(false)
  const handleChange = useCallback((content) => onEdit(task.set({ content })), [task, onEdit])
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
    end: (item: any, _: any) => {
      onDragEnd(item.dragIndex, item.hoverIndex)
    }
  })

  useDebounce(() => {
    setIsAnimated(false)
    if (content.replace(WHITESPACE_REGEX, "") === task.content.replace(WHITESPACE_REGEX, "")) {
      return
    }
    handleChange(content)
  }, 3000, [content])

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
}

interface EmptyTaskProps {
  onAdd: () => void;
}

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