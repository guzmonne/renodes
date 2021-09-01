import { useState, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useDebounceCallback } from "@react-hook/debounce"
import type { KeyboardEventHandler, FormEvent } from "react"

import { useMarked } from "../../hooks/useMarked"
import { useParsedContent } from "../../hooks/useParsedContent"
import { useHasMounted } from "../../hooks/useHasMounted"
import { ScrollArea } from "../../components/ScrollArea"
import { Loader } from "../Utils/Loader"
import type { ParsedContent } from "../../hooks/useParsedContent"

/**
 * NodeInterpreterProps represent the props of the NodeInterpreter component.
 */
export interface NodeInterpreterProps {
  /**
   * isInEditMode is a flag used to indicate if the Node being interpreted is
   * in edit mode.
   */
  isInEditMode?: boolean;
  /**
   * interpreter is the type of interpreter being used.
   */
  interpreter?: string;
  /**
   * content represents the content to be interpreted.
   */
  content: string;
  /**
   * onChange is called whenever an update to the content is done.
   * @param content - Edited content to save.
   */
  onChange: (content: string) => void;
  /**
   * onSave is called whenever the user wants to save the current edits.
   * @param content - Edited content to save.
   */
  onSave: (content: string) => void;
  /**
   * onAdd is called whenever the user wants to add a Node after the one
   * being edited.
   */
  onAdd: () => void;
  /**
   * onDelete is called if the user wants to delete the Node being edited.
   */
  onDelete: () => void;
  /**
   * tabIndex is the tab index to apply on an interpreter input for better
   * page handling.
   */
  tabIndex?: number;
}
/**
 * NodeInterpreter interprets the Node's content and displays it.
 */
export function NodeInterpreter({ isInEditMode, interpreter, ...props }: NodeInterpreterProps) {
  if (isInEditMode) return <NodeEditInterpreter {...props} />
  switch (interpreter) {
    case "code": return <NodeCodeInterpreter {...props} />
    default: return <NodeMarkdownInterpreter {...props} />
  }
}
/**
 * NodeEditInterpreterProps are thr props for the NodeEditInterpreter component.
 */
export interface NodeEditInterpreterProps {
  /**
   * content is the serialized version of the code
   */
  content: string;
  /**
   * onChange is called whenever an update to the content is done.
   * @param content - Edited content to save.
   */
  onChange: (content: string) => void;
  /**
   * onSave is called whenever the user wants to save the current edits.
   * @param content - Edited content to save.
   */
  onSave: (content: string) => void;
  /**
   * onAdd is called whenever the user wants to add a Node after the one
   * being edited.
   */
  onAdd: () => void;
  /**
   * onDelete is called if the user wants to delete the Node being edited.
   */
  onDelete: () => void;
  /**
   * tabIndex is the tab index to apply on an interpreter input for better
   * page handling.
   */
  tabIndex?: number;
}
export function NodeEditInterpreter({ content, onChange, onSave, ...props }: NodeEditInterpreterProps) {
  const parsed = useParsedContent<ParsedContent>(content, { content: "" })
  /**
   * handleChange can handle both simple contents, and serialized content objects.
   * @param content - Updated content.
   */
  const handleChange = useCallback((content: string) => {
    onChange(parsed.meta !== undefined
      ? JSON.stringify({ ...parsed, content })
      : content
    )
  }, [onChange, parsed])
  /**
   * handleSave can handle both simple contents, and serialized content objects.
   * @param content - Updated content.
   */
  const handleSave = useCallback((content: string) => {
    onSave(parsed.meta !== undefined
      ? JSON.stringify({ ...parsed, content })
      : content
    )
  }, [onSave, parsed])

  return <NodeEditInterpreterComponent
    {...props}
    onChange={handleChange}
    onSave={handleSave}
    content={parsed.content}
  />
}
/**
 * NodeEditInterpreter interprets the content as a textare component.
 */
export function NodeEditInterpreterComponent({ content, onChange, onSave, onAdd, onDelete, ...props }: NodeEditInterpreterProps) {
  const [unbouncedContent, setDebouncedContent] = useState(content)
  const onDebouncedChange = useDebounceCallback(onChange, 1000)
  /**
   * handleChange handles updates to the content
   * @param e - React form event of an HTMLTextAreaElement
   */
  const handleChange = useCallback((e: FormEvent<HTMLTextAreaElement>) => {
    const updatedContent = e.currentTarget.value
    setDebouncedContent(updatedContent)
    if (updatedContent !== content) onDebouncedChange(updatedContent)
  }, [onDebouncedChange, setDebouncedContent, content])
  /**
   * handleKeyDown holds the logic to manage the different key bindings supported.
   * @param e - React KeyboardEvent object for an HTMLTextAreaElement
   */
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>((e) => {
    if (!e.shiftKey && !e.ctrlKey) return
    switch (e.key) {
      case "Enter": {
        e.preventDefault()
        onAdd()
        return
      }
      case "Delete": {
        e.preventDefault()
        onDelete()
        return
      }
      case "s": {
        onSave(unbouncedContent)
        return
      }
    }
  }, [onAdd, onDelete, onSave, unbouncedContent])

  return (
    <TextareaAutosize
      name="content"
      className="Interpreter Interpreter__Edit"
      value={unbouncedContent}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      autoFocus={true}
      {...props}
    />
  )
}
/**
 * NodeCodeInterpreterProps defines the porps of the NodeCodeInterpreter component.
 */
export interface NodeCodeInterpreterProps {
  /**
   * content is the serialized data
   */
  content: string;
  /**
   * onChange updates the content of the Node.
   */
  onChange: (content: string) => void;
}
/**
 * NodeCodeParsedContent describes the types of the deserialized content of a
 * Node interpreted as code.
 */
export interface CodeParsedContent {
  /**
   * content is the code to be rendered.
   */
  content: string;
  /**
   * meta holds metadata on how to render the code.
   */
  meta: {
    /**
     * language is the language of the weritten code.
     */
    language: string;
    /**
     * filename is the name of the filename that holds the code snippet.
     */
    filename?: string;
  }
}
/**
 * NodeCodeInterpreter handles the logic of the NodeCodeInterpreterComponent.
 */
export function NodeCodeInterpreter({ content, onChange }: NodeCodeInterpreterProps) {
  const parsed = useParsedContent<CodeParsedContent>(content, { content: "", meta: { language: "js", filename: "" } })
  const [language, setLanguage] = useState(parsed.meta.language)
  const [filename, setFilename] = useState(parsed.meta.filename)
  /**
   * handleChange applies the changes done on the language and filename.
   */
  const handleChange = useCallback(() => {
    onChange(JSON.stringify({ ...parsed, meta: { language, filename } }))
  }, [onChange, language, filename])
  /**
   * debounceHandleChange is the debounced verion of handleChange
   */
  const debouncedHandleChange = useDebounceCallback(handleChange, 1000)
  /**
   * handleLanguageChange updates the value stored on the language state variable.
   * @param e - React FormEvent for an HTMLInptuElement.
   */
  const handleLanguageChange = useCallback((e: FormEvent<HTMLInputElement>) => {
    setLanguage(e.currentTarget.value)
    if (e.currentTarget.value !== parsed.meta.language) debouncedHandleChange()
  }, [setLanguage])
  /**
   * handleFilenameChange updates the value stored on the filename state variable.
   * @param e - React FormEvent for an HTMLInptuElement.
   */
  const handleFilenameChange = useCallback((e: FormEvent<HTMLInputElement>) => {
    setFilename(e.currentTarget.value)
    if (e.currentTarget.value !== parsed.meta.filename) debouncedHandleChange()
  }, [setFilename])


  return <NodeCodeInterpreterComponent
    filename={filename}
    language={language}
    onFilenameChange={handleFilenameChange}
    onLanguageChange={handleLanguageChange}
    content={parsed.content}
  />
}
/**
 * NodeCodeInterpreterComponentProps represent the props of NodeInterpreterComponent.
 */
export interface NodeCodeInterpreterComponentProps {
  /**
   * filename corresponds to the filename that the code snippets belongs to.
   */
  filename: string;
  /**
   * language corresponds to the language that the code snippet is writen.
   */
  language: string;
  /**
   * content is the code snippet string that must be rendered.
   */
  content: string;
  /**
   * onFilenameChange is the function called to update the value of the filename var.
   * @param filename - New filename value.
   */
  onFilenameChange: (e: FormEvent<HTMLInputElement>) => void;
  /**
   * onLanguageChange is the function called to update the value of the filename var.
   * @param filename - New filename value.
   */
  onLanguageChange: (e: FormEvent<HTMLInputElement>) => void;
}
export function NodeCodeInterpreterComponent({ language, content, filename, onFilenameChange, onLanguageChange }: NodeCodeInterpreterComponentProps) {
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className="Interpreter Interpreter__Code">
      {!hasMounted
        ? <Loader />
        : <ScrollArea orientation="horizontal">
          <pre className="Interpreter__Code--pre">
            <code className={`language-${language}`} children={content} />
          </pre>
        </ScrollArea>
      }
      <div className="Interpreter__Code--inputs">
        <input type="text" value={filename} onChange={onFilenameChange} className="Interpreter__Code--filename" />
        <input type="text" value={language} onChange={onLanguageChange} className="Interpreter__Code--language" />
      </div>
    </div>
  )
}
/**
 * NodeMarkdownInterpreter can interpret and rende the Node's content as Markdown.
 */
export function NodeMarkdownInterpreter({ content }: { content: string }) {
  const parsed = useParsedContent(content, { content: "", meta: { language: "js" } })
  const __html = useMarked(parsed.content)
  const hasMounted = useHasMounted()

  if (hasMounted && window.Prism) window.Prism.highlightAll()

  return (
    <div className="Interpreter Interpreter__Markdown">
      {!hasMounted
        ? <Loader />
        : <div dangerouslySetInnerHTML={{ __html }} />
      }
    </div>
  )
}