import { useState, useEffect } from "react"
import marked from "marked"

import { htmlSanitizer } from "./utils/HtmlSanitizer"

/**
 * useMarked parses a markdown string into a sanitized HTML output.
 * @param markdown - Markdown string to conver.
 * @param options -
 */
export const useMarked = (markdown: string) => {
  const [html, setHtml] = useState(markdown)

  useEffect(() => {
    const tokens = marked.lexer(markdown)
    const html = marked.parser(tokens)
    setHtml(htmlSanitizer.sanitize(html))
  }, [markdown])

  return html
}