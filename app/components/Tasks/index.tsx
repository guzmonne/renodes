import { useCallback, Fragment, forwardRef, useState } from "react"
import TextareaAutosize from "react-textarea-autosize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPencilAlt, faChevronDown, faChevronRight, faDotCircle, faEllipsisV, faExternalLinkAlt, faPlus, faSave, faTrash } from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import ReactMarkdown from "react-markdown"
import { useDebounceCallback } from "@react-hook/debounce"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"
import type { FormEvent, KeyboardEventHandler } from "react"

import { Loader } from "../Utils/Loader"
import { useHasMounted } from "../../hooks/useHasMounted"
import { NodesProvider, useNodesContext } from "../../hooks/useNodesContext"
import { useDrag } from "../../hooks/useDrag"
import { useParsedContent } from "../../hooks/useParsedContent";
import { ScrollArea } from "../../components/ScrollArea"
import type { Task } from "../../models/task"
import type { ParsedContent } from "../../hooks/useParsedContent"

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
  const { handleMeta } = useNodesContext()
  const { ref, handlerId, drag } = useDrag(task, index)
  /**
   * handleToggleSubTasks toggles the value of the flag `isOpened` on the task metadata.
   */
  const handleToggleSubTasks = useCallback(() => handleMeta(task.set({ meta: { isOpened: !task.meta.isOpened } })), [task])

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
 * Interpreter is the component used to show the appropiate task
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
 * EditInterpreter is the component used to display tasks as text.
 */
Tasks.EditInterpreter = function ({ task, index }: TaskProps) {
  const { handleEdit, handleAdd, handleDelete } = useNodesContext()
  const { hoverClasses } = useDrag(task, index)
  const parsed = useParsedContent<ParsedContent>(task.content, { content: "" })
  const [content, setContent] = useState<string>(parsed.content)
  /**
   * handleParsedContentChange handles changes to the parsed.content object.
   */
  const handleParsedContentChange = useCallback(() => {
    handleEdit(task.set({
      content: parsed.meta !== undefined
        ? JSON.stringify({ ...parsed, content })
        : content
    }))
  }, [handleEdit, task, content, parsed])
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
      case "Enter": { e.preventDefault(); handleAdd(task); break }
      case "Delete": { e.preventDefault(); handleDelete(task); break }
      case "s": {
        handleEdit(task.set({
          content: parsed.meta !== undefined
            ? JSON.stringify({ ...parsed, content })
            : content,
          meta: { isInEditMode: false }
        }), parsed.content !== content)
      }
    }
  }, [handleAdd, handleDelete, task, content])

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
 * MarkdownInterpreter is the component used to display tasks as markdown.
 */
Tasks.MarkdownInterpreter = function ({ task, index }: TaskProps) {
  const { hoverClasses } = useDrag(task, index)
  const parsed = useParsedContent(task.content, { content: "", meta: { language: "js" } })
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className={cn("Interpreter Interpreter__Markdown", hoverClasses)}>
      <ReactMarkdown children={parsed.content} />
    </div>
  )
}
export interface CodeParsedContentMeta {
  content: string;
  meta: {
    language: string;
    filename?: string;
  }
}
/**
 * CodeInterpreter is the component used to display tasks as code.
 */
Tasks.CodeInterpreter = function ({ task, index }: TaskProps) {
  const { handleEdit } = useNodesContext()
  const { hoverClasses } = useDrag(task, index)
  const parsed = useParsedContent<CodeParsedContentMeta>(task.content, { content: "", meta: { language: "js", filename: "" } })
  const [language, setLanguage] = useState<string>(parsed.meta.language)
  const [filename, setFilename] = useState<string>(parsed.meta.filename)
  const debouncedHandleEdit = useDebounceCallback(() => {
    handleEdit(task.set({
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

/**
 * Dropdown is the component used to render the Node dropdown menu
 */
Tasks.Dropdown = function ({ task }: TaskProps) {
  const { handleEdit, handleAdd, handleDelete } = useNodesContext()
  /**
   * handleSelectExternalLink is the callback called when a select external link event is produced.
   */
  const handleSelectExternalLink = useCallback(() => window.open(window.location.origin + "/" + task.id), [task])
  /**
   * handleSelectDelete is the callback called when a select delete event is produced.
   */
  const handleSelectDelete = useCallback(() => handleDelete(task), [handleDelete, task])
  /**
   * handleSelectAdd is the callback called when a select add event is produced.
   */
  const handleSelectAdd = useCallback(() => handleAdd(task), [handleAdd, task])
  /**
   * handleInterpreter updates the value of the task's interpreter.
   * @param interpreter - New interpreter value.
   */
  const handleInterpreter = useCallback((interpreter: string) => {
    const params: any = { interpreter, meta: { isInEditMode: false } }
    handleEdit(task.set(params))
  }, [task, handleEdit])
  /**
   * handleToggleEditMode toggles the flag isInEditMode from the tasks metadata.
   */
  const handleToggleEditMode = useCallback(() => {
    const params: any = { meta: { isInEditMode: !task.meta.isInEditMode } }
    handleEdit(task.set(params), false)
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
          <div className="DropdownMenu__LeftSlot">{<FontAwesomeIcon icon={task.meta.isInEditMode ? faSave : faPencilAlt} />}</div>
          <div className="DropdownMenu__CenterSlot">{task.meta.isInEditMode ? "Save" : "Edit"}</div>
          <div className="DropdownMenu__RightSlot">{task.meta.isInEditMode && "⌃+s"}</div>
        </DropdownMenu.Item>
        <DropdownMenu.Root>
          <DropdownMenu.TriggerItem className="DropdownMenu__Item">
            <div className="DropdownMenu__LeftSlot"></div>
            <div className="DropdownMenu__CenterSlot">Interpreter</div>
            <div className="DropdownMenu__RightSlot"><FontAwesomeIcon icon={faChevronRight} /></div>
          </DropdownMenu.TriggerItem>
          <DropdownMenu.Content className="DropdownMenu__Content" sideOffset={2} alignOffset={-5}>
            <DropdownMenu.Label className="DropdownMenu__Label">Interpreter</DropdownMenu.Label>
            <DropdownMenu.RadioGroup className="DropdownMenu__RadioGroup" value={task.interpreter || "markdown"} onValueChange={handleInterpreter}>
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