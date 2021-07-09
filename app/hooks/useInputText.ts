import React from "react"

export type UseInputText = [
  string,
  React.Dispatch<React.SetStateAction<string>>,
  (e: React.FormEvent<HTMLInputElement>) => void
]
/**
 * useInputText is a hook that simplifies the `onChange` behaviour
 * of an `input` elment of type `text`.
 * @param defaultText - Initial text value
 */
export function useInputText(defaultText: string): UseInputText {
  const [text, setText] = React.useState<string>(defaultText)

  function handleChange(e: React.FormEvent<HTMLInputElement>) {
    setText(e.currentTarget.value)
  }

  return [text, setText, handleChange]
}