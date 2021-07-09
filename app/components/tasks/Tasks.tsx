import { useState, useEffect, useCallback, useRef, Fragment, ChangeEvent } from "react"
import { useLocation } from "react-router-dom"
import { Form } from "remix"
import { ulid } from "ulid"
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd"
import { XYCoord } from 'dnd-core'
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import type { SyntheticEvent } from "react"

import { useLocalStorage } from "../../hooks/useLocalStorage"
import { Input } from "../layout/Input"
import { Task } from "../../api/models/task"
import { Loader } from "../utils/Loader"
import { useHasMounted } from "../../hooks/useHasMounted"
import { useLevel } from "../../hooks/useLevel"
import { useDebounce } from "../../hooks/useDebounce"
import { Number } from "aws-sdk/clients/iot"

/**
 * TasksProps represent the `props` of the Tasks component.
 */
export interface TasksProps {
  /**
   * tasks is the Task list.
   */
   collection?: Task[];
  /**
   * taskComponent can be used to override the default Task Component.
   */
  taskComponent?: (props: TaskProps) => JSX.Element;
}
/**
 * Tasks renders a list of Tasks and tracks its visual mode.
 */
export function Tasks({collection = [], taskComponent = Tasks.Task}: TasksProps) {
  const TaskComponent = taskComponent
  const [tasks, setTasks] = useState<Task[]>(collection)
  const handleMoveTask = useCallback(moveTask, [tasks])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="Tasks">
        {tasks.map((task: Task, index: Number) => (
          <TaskComponent
            key={task.id}
            task={task}
            index={index}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDrag={handleMoveTask}
          />
        ))}
      </div>
      <Input onAdd={handleAdd}/>
    </DndProvider>
  )
  /**
   * handleAdd allows a Child component to add Tasks to the `tasks` list.
   * @param task - Task to add to the list.
   */
  function handleAdd(task: Task) {
    setTasks([...tasks, task])
  }
  /**
   * handleDelete allows a Child component to remove a task from the list.
   */
  function handleDelete(deletedTask: Task) {
    setTasks(tasks.filter(t => t.id !== deletedTask.id))
  }
  /**
   * handleEdit allows a Child component to update a task f
   */
  function handleEdit(task: Task) {
    const index = tasks.findIndex((t: Task) => t.id === task.id)
    setTasks([...tasks.slice(0, index), task, ...tasks.slice(index + 1)])
  }
  /**
   * moveTask handles dragging a task.
   */
  function moveTask(dragIndex: number, hoverIndex: number) {
    const task = tasks[dragIndex]
    const _tasks = [...tasks]
    _tasks.splice(dragIndex, 1)
    _tasks.splice(hoverIndex, 0, task)
    setTasks(_tasks)
  }
}

interface ToggleSubTasksButtonProps {
  onClick: (e: SyntheticEvent) => void,
  isShowingSubTasks: boolean;
}

Tasks.ToggleSubTasksButton = ({onClick, isShowingSubTasks}: ToggleSubTasksButtonProps) => {
  const hasMounted = useHasMounted();

  if (!hasMounted) return null;

  return (
    <button className="link square" onClick={onClick} type="button">
      {isShowingSubTasks ? <i className="fa fa-chevron-down" /> : <i className="fa fa-chevron-right" />}
    </button>
  )
}

interface ToggleIsInEditModeProps {
  onClick: (e: SyntheticEvent) => void;
  isInEditMode: boolean;
}

Tasks.ToggleIsInEditMode = ({onClick, isInEditMode}: ToggleIsInEditModeProps) => (
  <button className="link square p-color-hover hover" onClick={onClick} type={isInEditMode ? "button" : "submit"}>
    {isInEditMode ? <i className="fa fa-sd-card"/> : <i className="fa fa-pencil"></i>}
  </button>
)

interface TaskFormProps {
  action: string;
  task: Task;
  onSubmit?: (e: SyntheticEvent) => void;
  readOnly?: boolean;
}

Tasks.Form = ({action, task, onSubmit, readOnly}: TaskFormProps) => {
  const hasMounted = useHasMounted();
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState(task.content)
  const [isAnimated, setIsAnimated] = useState(false)

  useDebounce(() => {
    if (buttonRef.current) buttonRef.current.click()
    setIsAnimated(false)
  }, 2000, [content])

  if (!hasMounted) return null;

  return (
    <Form autoComplete="off" method="put" action={action} onSubmit={handleSubmit}>
      <input name="id" type="text"
        readOnly
        defaultValue={task.id}
        style={{display: "none"}}
      />
      <input name="content" className={isAnimated ? "animated" : ""} type="text" ref={inputRef}
        readOnly={readOnly}
        value={content}
        onChange={handlecontentChange}
      />
      <button type="submit" ref={buttonRef} style={{display: "none"}}></button>
    </Form>
  )
  /**
   * handlecontentChange updates the value of the content.
   * @param e - React `onChange` event.
   */
  function handlecontentChange(e: ChangeEvent<HTMLInputElement>): void {
    setIsAnimated(true)
    setContent(e.currentTarget.value)
  }
  /**
   * handleSubmit handles the behavior of the form.
   * @param e - React `onChange` event.
   */
  function handleSubmit(e: SyntheticEvent) {
    const target = e.target as typeof e.target & {content: { value: string };};
    if (target.content.value === task.content) e.preventDefault()
    if (onSubmit) onSubmit(e)
  }
}

interface IFrameProps {
  id: string;
}

Tasks.IFrame = ({id}: IFrameProps) => {
  const hasMounted = useHasMounted();
  const [height, setHeight] = useState<string>("0px")
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const level = useLevel()
  const refId = useRef<string>(ulid())

  useEffect(() => {
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  if (!hasMounted) return null;

  return (
    <Fragment>
      {!isLoaded && <div className="flex align-items-center justify-content-center"><Loader /></div>}
      <iframe
        onLoad={handleLoad}
        style={{width: "100%", height: isLoaded ? height : "0px"}}
        src={`/${id}?id=${refId.current}&task=none&navbar=none&level=${level + 1}`}
      />
    </Fragment>
  )
  /**
   * handleLoad sets the `isLoaded` flag to true.
   */
  function handleLoad() {
    setIsLoaded(true)
  }
  /**
   * handleMessage is the listener applied to the `message` event
   * coming from the `iframe`.
   * @parem e - Message event object.
   */
  function handleMessage(e: MessageEvent<any>) {
    const {type, payload} = e.data
    if (type !== "RESIZE" || payload.id !== refId.current) return
    setHeight(payload.height + "px")
  }
}

interface DeleteButtonProps {
  action: string;
  task: Task;
  onDelete?: (task: Task) => void;
}

Tasks.DeleteButton = ({task, action, onDelete}: DeleteButtonProps) => {
  return (
    <Form style={{maxWidth: "2rem"}} method="delete" action={action} onSubmit={handleSubmit}>
      <input type="string" name="id" defaultValue={task.id} style={{display: "none"}} />
      <button type="submit" className="h-color-hover link square hover"><i className="fa fa-trash"/></button>
    </Form>
  )
  /**
   * handleSubmit shows an alert to the user before to confirm the
   * deletion of the Task.
   */
  function handleSubmit(e: SyntheticEvent) {
    if (!confirm("Are you sure you want to delete this Task and all its Sub-Tasks?")) {
      e.preventDefault()
      return
    }
    if (onDelete) onDelete(task)
  }
}
/**
 * TaskDrag represents a Task being dragged.
 */
interface TaskDrag {
  /**
   * index is the position of the task being dragged.
   */
  index: number
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
   * readOnly sets the Task form to read only.
   */
  readOnly?: boolean;
  /**
   * onToggleEditMode is a function that should be used to toggle
   * the mode of the component.
   */
  onToggleEditMode?: (id: string) => void;
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
   * autoFocus is a flag that configures the autoFocus feature on
   * the subTask input.
   */
  autoFocus?: boolean;
}
Tasks.Task = ({task, readOnly, index, onDelete, onDrag}: TaskProps) => {
  const {pathname, search} = useLocation()
  const [isShowingSubTasks, setIsShowingSubTasks] = useLocalStorage<boolean>(`${task.id}#isShowingSubTasks`, false)
  const level = useLevel()
  const ref = useRef<HTMLDivElement>(null)
  const [{handlerId}, drop] = useDrop({
    accept: "TASK",
    collect: (monitor) => ({handlerId: monitor.getHandlerId()}),
    hover: (item: TaskDrag, monitor: DropTargetMonitor) => {
      if (!onDrag || !ref.current || index === undefined) return
      const dragIndex = item.index
      const hoverIndex = index
      if (dragIndex === hoverIndex) return
      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      // Determine mouse position
      const clientOffset = monitor.getClientOffset()
      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return
      // Call the event handler
      onDrag(dragIndex, hoverIndex)
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    }
  })

  const [{isDragging}, drag] = useDrag({
    type: "TASK",
    item: () => ({id: task.id, index}),
    collect: (monitor: any) => ({isDragging: monitor.isDragging()}),
    end: (item: any, monitor: any) => {
      handleDrag(item.index)
    },
  })

  drag(drop(ref))

  return (
    <div className="Task padding-left" style={{opacity: isDragging ? 0 : 1}} data-handler-id={handlerId}>
      <div ref={ref} className={`bg-${level % 6} padding-top padding-bottom padding-right flex row align-items-center justify-content-space-between`}>
        <Tasks.ToggleSubTasksButton isShowingSubTasks={isShowingSubTasks} onClick={handleToggleSubTasks}/>
        <Tasks.Form
          action={pathname + search}
          task={task}
          readOnly={readOnly}
        />
        <Tasks.DeleteButton task={task} action={pathname + search} onDelete={onDelete} />
      </div>
      {!isDragging && isShowingSubTasks && <Tasks.IFrame id={task.id} />}
    </div>
  )
  /**
   * handleToggleSubTasks toggles showing or hiding sub-tasks.
   */
  function handleToggleSubTasks() {
    setIsShowingSubTasks(!isShowingSubTasks)
  }
  /**
   * handleDrag saves the new position of the task.
   */
  function handleDrag(index: number) {
    fetch(`/api/tasks/${task.id}/drag/${index}`, {method: "POST"})
      .then((response) => {
        if (!response.ok) {
          throw new Error("Drag not saved!")
        }
        console.log("Drag saved")
      })
      .catch((err) => console.error(err))
  }
}