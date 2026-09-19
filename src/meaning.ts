import { suggestTags, type StoredRecord } from './storage'

const genericTags = new Set(['pessoal', 'compras', 'carreira', 'estudos', 'lazer', 'dinheiro', 'viagens', 'casa'])

export type PreferenceShift = {
  id: string
  topic: string
  previous: StoredRecord
  current: StoredRecord
  explicit: boolean
}

export type LifeEntity = {
  slug: string
  label: string
  count: number
  kinds: string[]
  records: StoredRecord[]
}

function norm(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function slug(value: string) {
  return encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'))
}

function recordTags(record: StoredRecord) {
  return record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
}

export function detectPreferenceShifts(records: StoredRecord[]): PreferenceShift[] {
  const preferenceRecords = records
    .filter((record) => !record.private && ['Preferência', 'Desejo', 'Pesquisa'].includes(record.type))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const grouped = new Map<string, StoredRecord[]>()
  preferenceRecords.forEach((record) => {
    recordTags(record)
      .filter((tag) => !genericTags.has(tag))
      .forEach((tag) => {
        const current = grouped.get(tag) ?? []
        current.push(record)
        grouped.set(tag, current)
      })
  })

  return [...grouped.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([topic, items]) => {
      const previous = items[items.length - 2]
      const current = items[items.length - 1]
      const latest = norm(current.text)
      const explicit = ['agora', 'prefiro', 'na verdade', 'não quero', 'nao quero', 'deixei de', 'mais do que', 'em vez de'].some((term) => latest.includes(term))
      return {
        id: topic + '-' + current.id,
        topic,
        previous,
        current,
        explicit,
      }
    })
    .filter((shift) => shift.previous.id !== shift.current.id)
    .sort((a, b) => b.current.createdAt.localeCompare(a.current.createdAt))
    .slice(0, 6)
}

const knownEntities: Array<[string, string[]]> = [
  ['SQL', ['sql', 't-sql']],
  ['Power BI', ['power bi', 'powerbi']],
  ['Python', ['python']],
  ['SAP', ['sap', 'co88', 'co-pa']],
  ['Casio', ['casio']],
  ['Onix', ['onix']],
  ['Gol', ['gol']],
  ['Kindle', ['kindle']],
  ['KOReader', ['koreader']],
  ['GitHub', ['github']],
  ['Finance Analytics', ['finance analytics']],
]

export function deriveEntities(records: StoredRecord[]): LifeEntity[] {
  const publicRecords = records.filter((record) => !record.private)
  const buckets = new Map<string, { label: string; records: StoredRecord[] }>()

  publicRecords.forEach((record) => {
    const text = norm(record.text)
    const candidates = new Set<string>()

    recordTags(record)
      .filter((tag) => !genericTags.has(tag))
      .forEach((tag) => candidates.add(tag))

    knownEntities.forEach(([label, terms]) => {
      if (terms.some((term) => text.includes(norm(term)))) candidates.add(label)
    })

    candidates.forEach((label) => {
      const key = norm(label)
      const bucket = buckets.get(key) ?? { label, records: [] }
      if (!bucket.records.some((item) => item.id === record.id)) bucket.records.push(record)
      buckets.set(key, bucket)
    })
  })

  return [...buckets.values()]
    .filter((bucket) => bucket.records.length >= 2)
    .map((bucket) => ({
      slug: slug(bucket.label),
      label: bucket.label,
      count: bucket.records.length,
      kinds: [...new Set(bucket.records.map((record) => record.type))],
      records: bucket.records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .sort((a, b) => b.count - a.count)
}

export function entityBySlug(records: StoredRecord[], entitySlug: string) {
  return deriveEntities(records).find((entity) => entity.slug === entitySlug) ?? null
}
