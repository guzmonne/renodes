import { useState, useMemo, useEffect } from "react"

/**
 * ParsedContent represents a deserialized content string.
 */
export interface ParsedContent {
  /**
   * content is the actual content of the string.
   */
  content: string;
  /**
   * meta represents aditional metadata related to the content.
   */
  meta?: { [key: string]: any };
}
/**
 * useParsedContent holds the necessary logic to parse a Node Content string.
 * @param content - Content string to parse.
 * @param defaultValue - Default value to return in case the content string parse errors.
 */
export function useParsedContent<ExtendedParsedContent extends ParsedContent>(content: string, defaultValue: ExtendedParsedContent): ExtendedParsedContent {
  const memoizedDefaultValue = useMemo(() => defaultValue, [])
  const [parsed, setParsed] = useState<ExtendedParsedContent>(parse(content, memoizedDefaultValue))

  useEffect(() => {
    setParsed(parse(content, memoizedDefaultValue))
  }, [content, memoizedDefaultValue, setParsed])

  return parsed
}
/**
 * Functions
 */
/**
 * parse parses a content string and converts it into a ParsedContent object.
 * @param content - Content string to parse.
 * @param defaultValue - Default value to return in case the content string parse errors.
 */
function parse<ExtendedParsedContent extends ParsedContent>(content: string, defaultValue: ExtendedParsedContent): ExtendedParsedContent {
  let parsed: ExtendedParsedContent
  try {
    parsed = JSON.parse(content)
    parsed.content = parsed.content || content
    parsed.meta = parsed.meta || defaultValue.meta
  } catch (err) {
    parsed = { ...defaultValue, content }
  }
  return parsed
}