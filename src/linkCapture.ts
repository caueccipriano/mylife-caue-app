export type CaptureLink = { kind: string; url?: string }

// No remote link previews: all URLs stay local until an explicit user action.
export function normalizeCaptureLink(raw: string): string | null {
  const text = raw.trim()
  if (!text || /\s/.test(text)) return null
  const hasProtocol = /^https?:\/\//i.test(text)
  if (!hasProtocol && /^[a-z][a-z0-9+.-]*:/i.test(text)) return null
  try {
    const url = new URL(hasProtocol ? text : 'https://' + text)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function isDuplicateCaptureLink(existing: CaptureLink[], normalized: string): boolean {
  return existing.some((attachment) =>
    attachment.kind === 'link' &&
    normalizeCaptureLink(attachment.url || '') === normalized,
  )
}
