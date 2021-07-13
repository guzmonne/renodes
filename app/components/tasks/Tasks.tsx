import { useState, useEffect, useCallback, useRef, Fragment, ChangeEvent } from "react"
import { useLocation } from "react-router-dom"
import { useSubmit } from "remix"
import { ulid } from "ulid"
import { useDrag, useDrop } from "react-dnd"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import TextareaAutosize from "react-textarea-autosize";
import cn from "classnames"
import type { SyntheticEvent } from "react"

import { useLocalStorage } from "../../hooks/useLocalStorage"
import { Loader } from "../utils/Loader"
import { useHasMounted } from "../../hooks/useHasMounted"
import { useLevel } from "../../hooks/useLevel"
import { useDebounce } from "../../hooks/useDebounce"
import { Task } from "../../models/task"

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
  const handleOnDrag = useCallback(onDrag, [tasks])
  const handleOnDragEnd = useCallback(onDragEnd, [onDragEnd])
  const [[dragIndex, hoverIndex], setIndexes] = useState<number[]>([])
  const submit = useSubmit()

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="Tasks">
        {tasks.map((task: Task, index: number) => (
          <TaskComponent
            key={task.id}
            task={task}
            index={index}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDrag={handleOnDrag}
            onDragEnd={handleOnDragEnd}
            hoverTop={hoverIndex === index && dragIndex > index}
            hoverBottom={hoverIndex === index && dragIndex < index}
          />
        ))}
      </div>
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
    const task = tasks[dragIndex]
    const _tasks = [...tasks]
    _tasks.splice(dragIndex, 1)
    _tasks.splice(hoverIndex, 0, task)
    setTasks(_tasks)
    const afterId = hoverIndex !== 0
      ? tasks[dragIndex < hoverIndex ? hoverIndex : hoverIndex - 1].id
      : undefined
    const form  = document.createElement("form")
    form.method = "POST"
    const dragIdInput = document.createElement("input")
    dragIdInput.value = task.id
    dragIdInput.name  = "dragId"
    form.appendChild(dragIdInput)
    if (afterId) {
      const afterInput  = document.createElement("input")
      afterInput.value = afterId
      afterInput.name  = "afterId"
      form.appendChild(afterInput)
    }
    submit(form)
  }
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
  readOnly?: boolean;
  hoverTop?: boolean;
  hoverBottom?: boolean;
}

Tasks.Form = ({action, task, readOnly, hoverBottom, hoverTop}: TaskFormProps) => {
  const hasMounted = useHasMounted();
  const ref = useRef<HTMLFormElement>(null)
  const [content, setContent] = useState(task.content)
  const [isAnimated, setIsAnimated] = useState(false)
  const submit = useSubmit()

  useDebounce(() => {
    if (ref.current) {
      const elements = ref.current.elements as typeof ref.current.elements & {content: { value: string };};
      if (elements.content.value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "") === task.content.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")) return
      submit(ref.current, {method: "put"})
    }
    setIsAnimated(false)
  }, 3000, [content])

  if (!hasMounted) return null;

  return (
    <form ref={ref} autoComplete="off" method="put" action={action}>
      <input name="id" type="text"
        readOnly
        defaultValue={task.id}
        style={{display: "none"}}
      />
      <TextareaAutosize name="content"
        className={cn({animated: isAnimated, hoverBottom, hoverTop})}
        readOnly={readOnly}
        value={content}
        onChange={handlecontentChange}
      />
    </form>
  )
  /**
   * handlecontentChange updates the value of the content.
   * @param e - React `onChange` event.
   */
  function handlecontentChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setIsAnimated(true)
    setContent(e.currentTarget.value)
  }
}

interface IFrameProps {
  id: string;
  isVisible: boolean;
}

Tasks.IFrame = ({id, isVisible}: IFrameProps) => {
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

  if (!isVisible && !isLoaded) return null;

  return (
    <Fragment>
      {!isLoaded && <div className="flex align-items-center justify-content-center"><Loader /></div>}
      <iframe
        onLoad={handleLoad}
        style={{width: "100%", height: isLoaded ? height : "0px", display: isVisible ? "block" : "none"}}
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
   * onDragEnd will be called whene the dragin motion is stopped.
   */
  onDragEnd?: (dragIndex: number, hoverIndex: number) => void;
  /**
   * autoFocus is a flag that configures the autoFocus feature on
   * the subTask input.
   */
  autoFocus?: boolean;

  hoverTop?: boolean;

  hoverBottom?: boolean;
}
Tasks.Task = ({task, readOnly, index, onDrag, onDragEnd, hoverBottom, hoverTop}: TaskProps) => {
  const {pathname, search} = useLocation()
  const [isShowingSubTasks, setIsShowingSubTasks] = useLocalStorage<boolean>(`${task.id}#isShowingSubTasks`, false)
  const ref = useRef<HTMLDivElement>(null)
  const hasMounted = useHasMounted();

  const [{handlerId}, drop] = useDrop({
    accept: "TASK",
    collect: (monitor) => ({handlerId: monitor.getHandlerId()}),
    hover: (item: TaskDrag) => {
      if (!onDrag || !ref.current || index === undefined) return
      const {dragIndex, hoverIndex} = item
      if (hoverIndex === index) return
      item.hoverIndex = index
      onDrag(dragIndex, index)
    }
  })

  const [{}, drag] = useDrag({
    type: "TASK",
    item: () => ({id: task.id, dragIndex: index}),
    collect: (monitor: any) => ({isDragging: monitor.isDragging()}),
    end: (item: any, _: any) => {
      onDragEnd(item.dragIndex, item.hoverIndex)
    }
  })

  if (!hasMounted) return null;

  drag(drop(ref))

  return (
    <div className="Task padding-left" ref={ref}>
      <div className={`flex row justify-content-space-between`}>
        <div onClick={handleToggleSubTasks} className="control">
          {isShowingSubTasks
            ? <i className="fa fa-chevron-down" aria-hidden="true" />
            : <i className="fa fa-chevron-right" aria-hidden="true" />}
        </div>
        <div className="control" ref={drag} data-handler-id={handlerId}>
          <i className="fa fa-grip-vertical" aria-hidden="true"/>
        </div>
        <Tasks.Form
          action={pathname + search}
          task={task}
          readOnly={readOnly}
          hoverBottom={hoverBottom}
          hoverTop={hoverTop}
        />
      </div>
      <Tasks.IFrame id={task.id} isVisible={isShowingSubTasks}/>
    </div>
  )
  /**
   * handleToggleSubTasks toggles showing or hiding sub-tasks.
   */
  function handleToggleSubTasks() {
    setIsShowingSubTasks(!isShowingSubTasks)
  }
}