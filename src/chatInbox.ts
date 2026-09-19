export type ChatInboxItem = {
  text: string
  type?: string
  area?: string
  track?: boolean
  followUpDays?: number
  private?: boolean
  whyItMatters?: string
  source?: 'chatgpt' | 'share'
}

export type ChatInboxBatch = {
  id: string
  createdAt: string
  items: ChatInboxItem[]
}

const KEY = 'eu-chat-inbox-v1'

function readRaw(): ChatInboxBatch[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]') as ChatInboxBatch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRaw(value: ChatInboxBatch[]) {
  localStorage.setItem(KEY, JSON.stringify(value.slice(-30)))
  window.dispatchEvent(new Event('eu-chat-inbox-updated'))
}

function fingerprint(items: ChatInboxItem[]) {
  const source = JSON.stringify(items)
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0
  }
  return 'chat-' + Math.abs(hash)
}

export function listChatInbox() {
  return readRaw().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function enqueueChatBatch(items: ChatInboxItem[]) {
  if (!items.length) return null

  const batches = readRaw()
  const id = fingerprint(items)
  const existing = batches.find((batch) => batch.id === id)
  if (existing) return existing

  const batch: ChatInboxBatch = {
    id,
    createdAt: new Date().toISOString(),
    items,
  }

  saveRaw([...batches, batch])
  return batch
}

export function removeChatBatch(id: string) {
  saveRaw(readRaw().filter((batch) => batch.id !== id))
}

export function clearChatInbox() {
  saveRaw([])
}
