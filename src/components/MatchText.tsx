export function MatchText({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return text
  const lower = text.toLowerCase()
  const find = needle.toLowerCase()
  const parts: Array<string | { mark: string; key: number }> = []
  let cursor = 0
  while (cursor < text.length) {
    const at = lower.indexOf(find, cursor)
    if (at < 0) {
      parts.push(text.slice(cursor))
      break
    }
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push({ mark: text.slice(at, at + find.length), key: at })
    cursor = at + find.length
  }
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? <span key={index}>{part}</span> : <mark key={part.key}>{part.mark}</mark>,
      )}
    </>
  )
}
