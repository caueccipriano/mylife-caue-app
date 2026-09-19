import type { StoredRecord } from './storage'

export type StarterPackItem = {
  key: string
  text: string
  type: string
  area: string
  daysAgo?: number
  status?: StoredRecord['status']
  journeyStage?: string
  tags?: string[]
  favorite?: boolean
  pinned?: boolean
  whyItMatters?: string
  nextMove?: string
  progressLevel?: StoredRecord['progressLevel']
  someday?: boolean
  chapterId?: string
  objectName?: string
  objectState?: StoredRecord['objectState']
  place?: string
  followUpDays?: number
}

export type StarterPack = {
  version: 1
  id: string
  title: string
  items: StarterPackItem[]
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeStarterPack(value: string): StarterPack {
  const parsed = JSON.parse(decodeBase64Url(value)) as StarterPack
  if (parsed?.version !== 1 || !parsed.id || !Array.isArray(parsed.items)) {
    throw new Error('Pacote incompatível.')
  }
  return parsed
}

function stableId(packId: string, key: string) {
  const source = packId + ':' + key
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return 'starter-' + Math.abs(hash >>> 0).toString(36)
}

export function recordFromStarterItem(pack: StarterPack, item: StarterPackItem, now = new Date()): StoredRecord {
  const created = new Date(now)
  created.setDate(created.getDate() - Math.max(0, item.daysAgo || 0))

  const status = item.status
  const followUpDays = status === 'active' ? item.followUpDays : undefined
  const followUpAt = followUpDays
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + followUpDays, 9, 0, 0, 0).toISOString()
    : undefined

  return {
    id: stableId(pack.id, item.key),
    text: item.text,
    type: item.type,
    area: item.area,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    source: 'import',
    status,
    startedAt: status === 'active' ? created.toISOString() : undefined,
    completedAt: status === 'completed' ? created.toISOString() : undefined,
    followUpDays,
    followUpAt,
    journeyStage: item.journeyStage,
    tags: item.tags,
    favorite: item.favorite,
    pinned: item.pinned,
    whyItMatters: item.whyItMatters,
    nextMove: item.nextMove,
    progressLevel: item.progressLevel,
    someday: item.someday,
    chapterId: item.chapterId,
    objectName: item.objectName,
    objectState: item.objectState,
    place: item.place,
  }
}
