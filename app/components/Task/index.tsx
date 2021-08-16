import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { ulid } from "ulid"
import TextareaAutosize from "react-textarea-autosize";
import cn from "classnames"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import ReactMarkdown from "react-markdown"
import { useDebounceCallback } from "@react-hook/debounce"
import { useDrag as useReactDndDrag, useDrop } from "react-dnd"
import type { FormEvent, KeyboardEventHandler } from "react"

import { Loader } from "../Utils/Loader"
import { ScrollArea } from "../../components/ScrollArea"
import { useHasMounted } from "../../hooks/useHasMounted"
import { useParsedContent } from "../../hooks/useParsedContent"
import { useTasksQuery } from "../../hooks/useTasksQuery"
import { Task as TaskModel, TaskBody } from "../../models/task"
import type { TaskPatch, TaskMeta } from "../../models/task"
import type { ParsedContent } from "../../hooks/useParsedContent"

declare global {
  interface Window { Prism?: { highlightAll: () => void }; }
}

export type TaskProps = {
  id: string;
  initialData: TaskModel | TaskBody;
  index?: number;
}

export interface ControlProps {
  icon: string;
  onClick?: () => void;
  className?: string;
}

export interface CodeParsedContentMeta {
  content: string;
  meta: {
    language: string;
    filename?: string;
  }
}

export interface TaskContextValue {
  data: TaskModel;
  query: { isLoading: boolean, isFetching: boolean, status: string };
  handleAddEmpty: () => void;
  handleAddAfter: () => void;
  handleEdit: (patch: TaskPatch, fetch?: boolean) => void;
  handleDelete: () => void;
  handleMeta: (meta: TaskMeta) => void;
  handleDrag: (dragIndex: number, hoverIndex: number) => void;
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

export const TaskContext = createContext<TaskContextValue>(undefined)

function useTaskContext() {
  const context = useContext(TaskContext)

  if (context === undefined) {
    throw new Error("useTaskContext must be used withing a NodeProvider")
  }

  return context
}

export function useDrag(task: TaskModel, index: number) {
  const ref = useRef<any>(null)
  const [[dragIndex, hoverIndex], setIndexes] = useState<number[]>([])
  const { handleDrag } = useTaskContext()
  const [hoverClasses, setHoverClasses] = useState("")
  /**
   * handleDrag updates the handle and drag indexes values.
   */
  const handleDragPreview = useCallback((newDragIndex: number, newHoverIndex: number) => (
    setIndexes([newDragIndex, newHoverIndex])
  ), [setIndexes])
  /**
   * handleDragEnd is called when the drag event is done to update the tasks.
   */
  const handleDragEnd = useCallback((dragIndex: number, hoverIndex: number) => {
    setIndexes([])
    if (dragIndex === hoverIndex) return
    handleDrag(dragIndex, hoverIndex)
  }, [setIndexes, handleDrag])

  const [{ handlerId }, drop] = useDrop({
    accept: task.parent || "TASK",
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item: TaskDrag) => {
      if (!ref.current || index === undefined) return
      const { dragIndex, hoverIndex } = item
      if (hoverIndex === index) return
      item.hoverIndex = index
      handleDrag(dragIndex, index)
    }
  })

  const [_, drag, preview] = useReactDndDrag({
    type: task.parent || "TASK",
    item: () => ({ id: task.id, dragIndex: index, type: task.parent || "TASK" }),
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    end: (item: any, _: any) => handleDragEnd(item.dragIndex, item.hoverIndex)
  })

  useEffect(() => setHoverClasses(cn({
    hoverTop: hoverIndex === index && dragIndex > index,
    hoverBottom: hoverIndex === index && dragIndex < index
  })), [index, hoverIndex, dragIndex])

  drop(preview(ref))

  return {
    drag,
    drop,
    handlerId,
    hoverClasses,
    handleDragPreview,
    handleDragEnd,
    preview,
    ref,
  }
}
/**
 * Task is the component that renders a Task as a top level task
 * or as part of a collection.
 */
export function Task({ index, initialData, id }: TaskProps) {
  /**
   * Get handle functions and state from React-Query
   */
  const {
    data,
    query,
    handleAddEmpty,
    handleAddAfter,
    handleEdit,
    handleDelete,
    handleMeta,
    handleDrag,
  } = useTasksQuery(id, initialData)

  return (
    <TaskContext.Provider value={{
      data,
      query,
      handleAddEmpty,
      handleAddAfter,
      handleEdit,
      handleDelete,
      handleMeta,
      handleDrag,
    }}>
      {index === undefined ? <Task.View /> : <Task.ItemView index={index} />}
    </TaskContext.Provider>
  )
}
/**
 * Task.View is the view of a top level task.
 */
Task.View = function TaskView() {
  const { data, query } = useTaskContext()

  if (query.isLoading) return <div className="Tasks"><Loader /></div>

  if (data.id === "home") return <Task.Collection />

  return (
    <Fragment>
      <div className="Task">
        <div className="Task__Controls">
          <Task.Control icon={"fa-chevron-right"} />
          <Task.Dropdown />
        </div>
        <Task.Interpreter />
      </div>
      <Task.Collection />
    </Fragment>
  )
}
/**
 * Task.ItemView is the view component for a Task that is part of a collection.
 */
Task.ItemView = ({ index }: Partial<TaskProps>) => {
  const { data, handleMeta } = useTaskContext()
  const { ref, handlerId, drag } = useDrag(data, index)
  /**
   * handleToggleSubTasks toggles the value of the flag `isOpened` on the task metadata.
   */
  const handleToggleSubTasks = useCallback(() => (
    handleMeta({ isOpened: !data.meta.isOpened })
  ), [handleMeta, data])

  return (
    <Fragment>
      <div className="Task" ref={ref}>
        <div className="Task__Controls">
          <Task.Control
            icon={data.meta.isOpened ? "fa-chevron-down" : "fa-chevron-right"}
            onClick={handleToggleSubTasks}
            ref={drag}
            data-handler-id={handlerId}
          />
          <Task.ItemDropdown />
        </div>
        <Task.Interpreter index={index} />
      </div>
      {data.meta.isOpened && <Task.Collection />}
    </Fragment>
  )
}
/**
 * Task.Control is a component that renders a Task control.
 */
Task.Control = forwardRef<HTMLDivElement, ControlProps>(function Control({ onClick, icon, className, ...props }, ref) {
  return (
    <div onClick={onClick} className={cn("Task__Control", className)} ref={ref} {...props}>
      <i className={cn("fas", icon)}></i>
    </div>
  )
})
/**
 * Task.Interpreter is the component that renders the appropiate component that should
 * interpret the content of the Task.
 */
Task.Interpreter = function TaskInterpreter({ index }: Partial<TaskProps>) {
  const { data } = useTaskContext()
  if (data.meta.isInEditMode) return <Task.EditInterpreter index={index} />
  switch (data.interpreter) {
    case "code":
      return <Task.CodeInterpreter index={index} />
    default:
      return <Task.MarkdownInterpreter index={index} />
  }
}

/**
 * EditInterpreter interprets the content as text, and allows its direct update.
 */
Task.EditInterpreter = function TaskEditInterpreter({ index }: Partial<TaskProps>) {
  const { data, handleEdit, handleAddAfter, handleDelete } = useTaskContext()
  const { hoverClasses } = useDrag(data, index)
  const parsed = useParsedContent<ParsedContent>(data.content, { content: "" })
  const [content, setContent] = useState<string>(parsed.content)
  /**
   * handleParsedContentChange handles changes to the parsed.content object.
   */
  const handleParsedContentChange = useCallback(() => {
    handleEdit(data.set({
      content: parsed.meta !== undefined
        ? JSON.stringify({ ...parsed, content })
        : content
    }))
  }, [handleEdit, data, content, parsed])
  /**
   * debouncedParsedContentChange is a debounced version of handleParsedContentChange
   */
  const debouncedParsedContentChange = useDebounceCallback(handleParsedContentChange, 1000)
  /**
   * handleContentChange is the event handler for changes on the contact element.
   * @param e - React FormEvent for a textarea element.
   */
  const handleContentChange = useCallback((e: FormEvent<HTMLTextAreaElement>) => {
    setContent(e.currentTarget.value)
    if (e.currentTarget.value !== parsed.content) debouncedParsedContentChange()
  }, [setContent])
  /**
   * handleKeyDown holds the logic to manage the differnt key bindings supported.
   * @param e - React KeyboardEvent object for an HTMLTextAreaElement.
   */
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>((e) => {
    if (!e.shiftKey && !e.ctrlKey) return
    switch (e.key) {
      case "Enter": { e.preventDefault(); handleAddAfter(); break }
      case "Delete": { e.preventDefault(); handleDelete(); break }
      case "s": {
        handleEdit(data.set({
          content: parsed.meta !== undefined
            ? JSON.stringify({ ...parsed, content })
            : content,
          meta: { isInEditMode: false }
        }), parsed.content !== content)
      }
    }
  }, [handleAddAfter, handleDelete, data, content])

  return (
    <TextareaAutosize
      name="content"
      className={cn("Interpreter Interpreter__Edit", hoverClasses)}
      value={content}
      onChange={handleContentChange}
      onKeyDown={handleKeyDown}
      autoFocus={true}
    />
  )
}
/**
 * Task.MarkdownInterpreter is the component used to display tasks as markdown.
 */
Task.MarkdownInterpreter = function TaskMarkdownInterpreter({ index }: Partial<TaskProps>) {
  const { data } = useTaskContext()
  const { hoverClasses } = useDrag(data, index)
  const parsed = useParsedContent(data.content, { content: "", meta: { language: "js" } })
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className={cn("Interpreter Interpreter__Markdown", hoverClasses)}>
      <ReactMarkdown children={parsed.content} />
    </div>
  )
}
/**
 * Task.CodeInterpreter is the component used to display tasks as code.
 */
Task.CodeInterpreter = function TaskCodeInterpreter({ index }: Partial<TaskProps>) {
  const { data, handleEdit } = useTaskContext()
  const { hoverClasses } = useDrag(data, index)
  const parsed = useParsedContent<CodeParsedContentMeta>(data.content, { content: "", meta: { language: "js", filename: "" } })
  const [language, setLanguage] = useState<string>(parsed.meta.language)
  const [filename, setFilename] = useState<string>(parsed.meta.filename)
  const debouncedHandleEdit = useDebounceCallback(() => {
    handleEdit(data.set({
      content: JSON.stringify({
        ...parsed,
        meta: { language, filename }
      })
    }))
  }, 1000)
  /**
   * handleLanguageChange updates the value stored on the language state variable.
   * @param e - React FormEvent for an HTMLInptuElement.
   */
  const handleLanguageChange = useCallback((e: FormEvent<HTMLInputElement>) => {
    setLanguage(e.currentTarget.value)
    if (e.currentTarget.value !== parsed.meta.language) debouncedHandleEdit()
  }, [setLanguage])
  /**
   * handleFilenameChange updates the value stored on the filename state variable.
   * @param e - React FormEvent for an HTMLInptuElement.
   */
  const handleFilenameChange = useCallback((e: FormEvent<HTMLInputElement>) => {
    setFilename(e.currentTarget.value)
    if (e.currentTarget.value !== parsed.meta.filename) debouncedHandleEdit()
  }, [setFilename])

  return (
    <div className={cn("Interpreter Interpreter__Code", hoverClasses)}>
      <Code language={language} content={parsed.content} />
      <div className="Interpreter__Code--inputs">
        <input type="text" value={filename} onChange={handleFilenameChange} className="Interpreter__Code--filename" />
        <input type="text" value={language} onChange={handleLanguageChange} className="Interpreter__Code--language" />
      </div>
    </div>
  )
}
/**
 * Task.Collection renders a list of Tasks and tracks its visual mode.
 */
Task.Collection = function TaskCollection() {
  const { data } = useTaskContext()

  return (
    <div className="Tasks">
      {data.collection.map((task: TaskModel, index: number) => (
        <Task key={task.id} id={task.id} initialData={task} index={index} />
      ))}
      {data.collection.length === 0 && <Task.New />}
    </div>
  )
}
/**
 * Task.New renders a component that shows an empty textarea that
 * creates new `Tasks`.
 */
Task.New = function TaskNew() {
  const { handleAddEmpty } = useTaskContext()

  return (
    <div className="Task">
      <div className="Task__Controls">
        <div className="Task__Control" onClick={handleAddEmpty}>
          <i className="fa fa-plus" aria-hidden="true" />
        </div>
      </div>
      <TextareaAutosize
        className="Interpreter Interpreter__Text"
        name="content"
        defaultValue=""
        onFocusCapture={handleAddEmpty}
      />
    </div>
  )
}
/**
 * Task.Dropdown is the component that renders the Dropdown menu for a parent Task
 */
Task.Dropdown = function TaskDropdown() {
  const { data, handleEdit, handleDelete } = useTaskContext()
  /**
   * handleSelectDelete is the callback called when a select delete event is produced.
   */
  const handleSelectDelete = useCallback(() => handleDelete(), [handleDelete])
  /**
   * handleInterpreter updates the value of the task's interpreter.
   * @param interpreter - New interpreter value.
   */
  const handleInterpreter = useCallback((interpreter: string) => {
    const params: any =
      handleEdit({ interpreter, meta: { isInEditMode: false } })
  }, [data, handleEdit])
  /**
 * handleToggleEditMode toggles the flag isInEditMode from the tasks metadata.
 */
  const handleToggleEditMode = useCallback(() => {
    const params: any = { meta: { isInEditMode: !data.meta.isInEditMode } }
    handleEdit({ meta: { isInEditMode: !data.meta.isInEditMode } }, false)
  }, [data])

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={Task.Control} icon={"fa-ellipsis-v"} />
      <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={5}>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleToggleEditMode}>
          <div className="DropdownMenu__LeftSlot">{data.meta.isInEditMode ? <i className="fas fa-save" /> : <i className="fas fa-pencil" />}</div>
          <div className="DropdownMenu__CenterSlot">{data.meta.isInEditMode ? "Save" : "Edit"}</div>
          <div className="DropdownMenu__RightSlot">{data.meta.isInEditMode && "⌃+s"}</div>
        </DropdownMenu.Item>
        <DropdownMenu.Root>
          <DropdownMenu.TriggerItem className="DropdownMenu__Item">
            <div className="DropdownMenu__LeftSlot"></div>
            <div className="DropdownMenu__CenterSlot">Interpreter</div>
            <div className="DropdownMenu__RightSlot"><i className="fas fa-chevron-right" /></div>
          </DropdownMenu.TriggerItem>
          <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={2} alignOffset={-5}>
            <DropdownMenu.Label className="DropdownMenu__Label">Interpreter</DropdownMenu.Label>
            <DropdownMenu.RadioGroup className="DropdownMenu__RadioGroup" value={data.interpreter || "markdown"} onValueChange={handleInterpreter}>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="markdown">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Markdown</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="data">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Task</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="code">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Code</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DropdownMenu.Separator className="DropdownMenu__Separator" />
        <DropdownMenu.Item className="DropdownMenu__Item DropdownMenu__Item--red" onSelect={handleSelectDelete}>
          <div className="DropdownMenu__LeftSlot"> <i className="fas fa-trash" /></div>
          <div className="DropdownMenu__CenterSlot">Delete Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Del</div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
/**
 * Task.ItemDropdown is the component that renders the Dropdown menu for a Task rendered
 * as part of a collection.
 */
Task.ItemDropdown = function TaskDropdown() {
  const { data, handleEdit, handleAddAfter, handleDelete } = useTaskContext()
  /**
   * handleSelectExternalLink is the callback called when a select external link event is produced.
   */
  const handleSelectExternalLink = useCallback(() => window.open(window.location.origin + "/" + data.id), [data])
  /**
   * handleSelectDelete is the callback called when a select delete event is produced.
   */
  const handleSelectDelete = useCallback(() => handleDelete(), [handleDelete])
  /**
   * handleSelectAdd is the callback called when a select add event is produced.
   */
  const handleSelectAdd = useCallback(() => handleAddAfter(), [handleAddAfter])
  /**
   * handleInterpreter updates the value of the task's interpreter.
   * @param interpreter - New interpreter value.
   */
  const handleInterpreter = useCallback((interpreter: string) => {
    const params: any = { interpreter, meta: { isInEditMode: false } }
    handleEdit(data.set(params))
  }, [data, handleEdit])
  /**
   * handleToggleEditMode toggles the flag isInEditMode from the tasks metadata.
   */
  const handleToggleEditMode = useCallback(() => {
    const params: any = { meta: { isInEditMode: !data.meta.isInEditMode } }
    handleEdit(data.set(params), false)
  }, [data])

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={Task.Control} icon={"fa-ellipsis-v"} />
      <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={5}>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectExternalLink}>
          <div className="DropdownMenu__LeftSlot"><i className="fas fa-external-link" /></div>
          <div className="DropdownMenu__CenterSlot">Open in new page</div>
          <div className="DropdownMenu__RightSlot"></div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleToggleEditMode}>
          <div className="DropdownMenu__LeftSlot">{data.meta.isInEditMode ? <i className="fas fa-save" /> : <i className="fas fa-pencil" />}</div>
          <div className="DropdownMenu__CenterSlot">{data.meta.isInEditMode ? "Save" : "Edit"}</div>
          <div className="DropdownMenu__RightSlot">{data.meta.isInEditMode && "⌃+s"}</div>
        </DropdownMenu.Item>
        <DropdownMenu.Root>
          <DropdownMenu.TriggerItem className="DropdownMenu__Item">
            <div className="DropdownMenu__LeftSlot"></div>
            <div className="DropdownMenu__CenterSlot">Interpreter</div>
            <div className="DropdownMenu__RightSlot"><i className="fas fa-chevron-right" /></div>
          </DropdownMenu.TriggerItem>
          <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={2} alignOffset={-5}>
            <DropdownMenu.Label className="DropdownMenu__Label">Interpreter</DropdownMenu.Label>
            <DropdownMenu.RadioGroup className="DropdownMenu__RadioGroup" value={data.interpreter || "markdown"} onValueChange={handleInterpreter}>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="markdown">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Markdown</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="data">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Task</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem className="DropdownMenu__Item" value="code">
                <DropdownMenu.DropdownMenuItemIndicator className="DropdownMenu__LeftSlot">
                  <i className="fas fa-check" />
                </DropdownMenu.DropdownMenuItemIndicator>
                <div className="DropdownMenu__CenterSlot">Code</div>
                <div className="DropdownMenu__RightSlot"></div>
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DropdownMenu.Separator className="DropdownMenu__Separator" />
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={handleSelectAdd}>
          <div className="DropdownMenu__LeftSlot"> <i className="fas fa-plus" /></div>
          <div className="DropdownMenu__CenterSlot">Add Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Enter</div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item DropdownMenu__Item--red" onSelect={handleSelectDelete}>
          <div className="DropdownMenu__LeftSlot"> <i className="fas fa-trash" /></div>
          <div className="DropdownMenu__CenterSlot">Delete Node</div>
          <div className="DropdownMenu__RightSlot">⇧+Del</div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
/**
 * Code renders some content as syntax highlighted code.
 */
function Code({ language = "js", content = "" }: { language?: string, content?: string }) {
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <ScrollArea orientation="horizontal">
      <pre className="Interpreter__Code--pre">
        <code className={`language-${language}`} children={content} />
      </pre>
    </ScrollArea>
  )
}