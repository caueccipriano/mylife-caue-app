import type { PersonalProfile } from './profile'
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
  profile?: PersonalProfile
}

function decodeBase64UrlBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function gunzip(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador não suporta a importação compactada.')
  }

  const stream = new Blob([Uint8Array.from(bytes).buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export async function decodeStarterPack(value: string): Promise<StarterPack> {
  const compressed = value.startsWith('gz.')
  const encoded = compressed ? value.slice(3) : value
  const bytes = decodeBase64UrlBytes(encoded)
  const text = compressed ? await gunzip(bytes) : new TextDecoder().decode(bytes)
  const parsed = JSON.parse(text) as StarterPack

  if (parsed?.version !== 1 || !parsed.id || !Array.isArray(parsed.items)) {
    throw new Error('Pacote incompatível.')
  }

  if (parsed.items.length > 250) {
    throw new Error('Pacote grande demais.')
  }

  if (parsed.profile?.displayName && (typeof parsed.profile.displayName !== 'string' || parsed.profile.displayName.length > 80)) {
    throw new Error('Perfil inválido.')
  }

  const validateNatal = (points: unknown) => Array.isArray(points) && points.length <= 24 && points.every((point) => {
    if (!point || typeof point !== 'object') return false
    const value = point as { name?: unknown; symbol?: unknown; longitude?: unknown; house?: unknown; retrograde?: unknown }
    return typeof value.name === 'string'
      && value.name.length <= 40
      && typeof value.symbol === 'string'
      && value.symbol.length <= 8
      && typeof value.longitude === 'number'
      && Number.isFinite(value.longitude)
      && value.longitude >= 0
      && value.longitude < 360
      && (value.house === undefined || (typeof value.house === 'number' && value.house >= 1 && value.house <= 12))
      && (value.retrograde === undefined || typeof value.retrograde === 'boolean')
  })

  if (parsed.profile?.astrology) {
    if (!validateNatal(parsed.profile.astrology.westernNatal) || !validateNatal(parsed.profile.astrology.vedicNatal)) {
      throw new Error('Perfil astrológico inválido.')
    }
  }

  const keys = new Set<string>()
  for (const item of parsed.items) {
    if (!item || typeof item.key !== 'string' || typeof item.text !== 'string' || typeof item.type !== 'string' || typeof item.area !== 'string') {
      throw new Error('Pacote contém registros inválidos.')
    }
    if (!item.key.trim() || item.key.length > 120 || item.text.length > 5000 || item.type.length > 80 || item.area.length > 80) {
      throw new Error('Pacote contém um registro fora dos limites.')
    }
    if (keys.has(item.key)) throw new Error('Pacote contém chaves duplicadas.')
    keys.add(item.key)
    if (item.tags && (!Array.isArray(item.tags) || item.tags.length > 20 || item.tags.some((tag) => typeof tag !== 'string' || tag.length > 80))) {
      throw new Error('Pacote contém tags inválidas.')
    }
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
