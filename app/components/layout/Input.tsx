import React from "react"
import { useLocation } from "react-router-dom"
import { Form } from "remix"
import { ulid } from "ulid"

import { useInputText } from "../../hooks/useInputText"
import type { Task } from "../../types"

interface InputProps {
  onAdd?: (task: Task) => void;
  autoFocus?: boolean;
}

export function Input({onAdd = () => {}, autoFocus}: InputProps) {
  const ref = React.createRef<HTMLInputElement>()
  const [content, setContent, handleTitlteChange] = useInputText("")
  const [id, setId, handleIdChange] = useInputText(ulid())
  const {pathname, search} = useLocation()

  return (
    <Form className="Input" autoComplete="off" replace method="post" action={pathname + search} onSubmit={handleSubmit}>
      <input autoFocus={autoFocus} type="text" name="content" ref={ref} value={content} onChange={handleTitlteChange} />
      <input type="text" name="id" style={{display: "none"}} value={id} onChange={handleIdChange} />
      <button type="submit" className="circle"><i aria-hidden="true" className="fa fa-plus"></i></button>
    </Form>
  )

  function handleSubmit(e: React.SyntheticEvent) {
    const target = e.target as typeof e.target & {content: { value: string }; id: { value: string }};
    if (target.content.value === "") {
      e.preventDefault()
      return
    }
    onAdd({id: target.id.value, content: target.content.value})
    if (ref && ref.current ) {
      ref.current.focus()
    }
    setContent("")
    setId(ulid())
  }
}