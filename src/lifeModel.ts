import type { BridgeCard } from './integrations'
import { suggestTags, type StoredRecord } from './storage'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isVisibleRecord(record: StoredRecord) {
  if (record.private || record.trashedAt) return false
  if (record.revealAt && !record.capsuleOpenedAt && new Date(record.revealAt).getTime() > Date.now()) return false
  return true
}

function words(value: string) {
  return [...new Set(
    normalize(value)
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  )]
}

export function findSimilarRecords(records: StoredRecord[], text: string) {
  const queryWords = new Set(words(text))
  if (queryWords.size < 2) return []

  return records
    .filter(isVisibleRecord)
    .map((record) => {
      const candidate = new Set(words(record.text))
      const intersection = [...queryWords].filter((word) => candidate.has(word)).length
      const union = new Set([...queryWords, ...candidate]).size
      const score = union ? intersection / union : 0
      return { record, score }
    })
    .filter(({ score }) => score >= .34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export type SensitiveHint = {
  kind: 'identity' | 'financial' | 'health' | 'contact' | 'private'
  label: string
}

export function detectSensitiveContent(text: string): SensitiveHint[] {
  const value = normalize(text)
  const hints: SensitiveHint[] = []

  if (/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/.test(text) || /\bcpf\b|rg|documento/.test(value)) {
    hints.push({ kind: 'identity', label: 'possível dado de identificação' })
  }
  if (/\bconta\b|agencia|agência|cartao|cartão|senha|pix|banco|emprestimo|empréstimo/.test(value)) {
    hints.push({ kind: 'financial', label: 'possível dado financeiro' })
  }
  if (/saude|saúde|medico|médico|exame|remedio|remédio|diagnostico|diagnóstico|tratamento/.test(value)) {
    hints.push({ kind: 'health', label: 'possível informação de saúde' })
  }
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text) || /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/.test(text)) {
    hints.push({ kind: 'contact', label: 'possível contato pessoal' })
  }
  if (/relacionamento|intimo|íntimo|sexo|familia|família/.test(value)) {
    hints.push({ kind: 'private', label: 'assunto potencialmente privado' })
  }

  return hints.filter((hint, index, all) => all.findIndex((item) => item.kind === hint.kind) === index)
}

export function buildDailyBrief(records: StoredRecord[], bridges: BridgeCard[]) {
  const publicRecords = records.filter(isVisibleRecord)
  const now = Date.now()
  const due = publicRecords.filter((record) => record.status === 'active' && record.followUpAt && new Date(record.followUpAt).getTime() <= now)
  const stale = publicRecords.filter((record) => record.status === 'active' && new Date(record.updatedAt || record.createdAt).getTime() < now - 21 * 86400000)
  const recent = publicRecords.filter((record) => new Date(record.createdAt).getTime() > now - 7 * 86400000)

  const areaCounts = new Map<string, number>()
  recent.forEach((record) => areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1))
  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const signals = bridges.filter((card) => card.bridge?.summary)
  const pieces: string[] = []

  if (due.length) pieces.push(due.length === 1 ? '1 coisa pede continuidade hoje' : due.length + ' coisas pedem continuidade hoje')
  if (stale.length) pieces.push(stale.length === 1 ? '1 assunto está parado há um tempo' : stale.length + ' assuntos estão parados há um tempo')
  if (topArea) pieces.push(topArea + ' foi o tema mais presente da semana')
  if (signals.length) pieces.push(signals.length + '/3 apps estão trazendo sinais')

  return {
    title: pieces.length ? 'Seu dia em contexto.' : 'Hoje está leve no EU.',
    text: pieces.length
      ? pieces.slice(0, 3).join(' · ') + '.'
      : 'Nada urgente apareceu. Você pode só viver o dia e guardar o que valer a pena.',
    dueCount: due.length,
    staleCount: stale.length,
    topArea,
  }
}

export type IdentityNow = {
  headline: string
  narrative: string
  topAreas: string[]
  topTags: string[]
  active: string[]
}

export function deriveIdentityNow(records: StoredRecord[]): IdentityNow {
  const publicRecords = records.filter(isVisibleRecord)
  const recent = publicRecords.filter((record) => new Date(record.createdAt).getTime() > Date.now() - 90 * 86400000)

  const areas = new Map<string, number>()
  const tags = new Map<string, number>()
  recent.forEach((record) => {
    areas.set(record.area, (areas.get(record.area) || 0) + 1)
    const recordTags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
    recordTags.forEach((tag) => tags.set(tag, (tags.get(tag) || 0) + 1))
  })

  const topAreas = [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([area]) => area)
  const topTags = [...tags.entries()]
    .filter(([tag]) => !topAreas.some((area) => normalize(area) === normalize(tag)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  const active = publicRecords
    .filter((record) => record.status === 'active')
    .slice(0, 5)
    .map((record) => record.text)

  const headline = topAreas.length
    ? 'Uma fase puxada por ' + topAreas.slice(0, 2).join(' + ') + '.'
    : 'Uma fase ainda ganhando contorno.'

  const narrative = [
    topTags.length ? 'Os temas que mais reaparecem são ' + topTags.slice(0, 4).join(', ') + '.' : '',
    active.length ? active.length + ' coisas continuam vivas e em movimento.' : 'Não há muitos compromissos ativos no arquivo agora.',
  ].filter(Boolean).join(' ')

  return { headline, narrative, topAreas, topTags, active }
}

export function deriveManifesto(records: StoredRecord[]) {
  const patterns = [/prefiro/i, /não quero/i, /nao quero/i, /quero construir/i, /é importante/i, /e importante/i, /gosto de/i, /decidi/i]
  return records
    .filter(isVisibleRecord)
    .filter((record) => ['Preferência', 'Decisão', 'Contexto', 'Objetivo'].includes(record.type) || patterns.some((pattern) => pattern.test(record.text)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
}

export type LifeChapter = {
  id: string
  label: string
  records: StoredRecord[]
  start: string
  end: string
}

export function deriveChapters(records: StoredRecord[]): LifeChapter[] {
  const publicRecords = records.filter(isVisibleRecord)
  const explicit = new Map<string, StoredRecord[]>()

  publicRecords.forEach((record) => {
    if (!record.chapterId) return
    const current = explicit.get(record.chapterId) ?? []
    current.push(record)
    explicit.set(record.chapterId, current)
  })

  const chapters: LifeChapter[] = [...explicit.entries()].map(([id, items]) => {
    const ordered = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return {
      id,
      label: id,
      records: ordered,
      start: ordered[0].createdAt,
      end: ordered[ordered.length - 1].createdAt,
    }
  })

  const tagBuckets = new Map<string, StoredRecord[]>()
  publicRecords.forEach((record) => {
    const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
    tags.forEach((tag) => {
      if (['pessoal','carreira','estudos','compras','lazer','dinheiro','viagens','casa'].includes(tag)) return
      const bucket = tagBuckets.get(tag) ?? []
      bucket.push(record)
      tagBuckets.set(tag, bucket)
    })
  })

  tagBuckets.forEach((items, tag) => {
    if (items.length < 4 || chapters.some((chapter) => normalize(chapter.label) === normalize(tag))) return
    const ordered = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const span = new Date(ordered[ordered.length - 1].createdAt).getTime() - new Date(ordered[0].createdAt).getTime()
    if (span < 14 * 86400000) return
    chapters.push({
      id: tag,
      label: tag,
      records: ordered,
      start: ordered[0].createdAt,
      end: ordered[ordered.length - 1].createdAt,
    })
  })

  return chapters.sort((a, b) => b.end.localeCompare(a.end)).slice(0, 10)
}

export function yearlyStory(records: StoredRecord[], year = new Date().getFullYear()) {
  const yearRecords = records.filter((record) =>
    isVisibleRecord(record)
    && new Date(record.createdAt).getFullYear() === year,
  )

  const typeCounts = new Map<string, number>()
  const areaCounts = new Map<string, number>()
  yearRecords.forEach((record) => {
    typeCounts.set(record.type, (typeCounts.get(record.type) || 0) + 1)
    areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1)
  })

  const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topAreas = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return {
    year,
    count: yearRecords.length,
    completed: yearRecords.filter((record) => record.status === 'completed').length,
    decisions: yearRecords.filter((record) => record.type === 'Decisão').length,
    desires: yearRecords.filter((record) => ['Desejo','Pesquisa','Preferência'].includes(record.type)).length,
    topTypes,
    topAreas,
    highlights: yearRecords.filter((record) => record.favorite || record.type === 'Conquista' || record.type === 'Marco').slice(0, 8),
  }
}
