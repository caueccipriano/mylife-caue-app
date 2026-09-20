import { isRecordVisibleForInsights, suggestTags, type MoodCheckin, type MoodValue, type StoredRecord } from './storage'

const FOCUS_KEY = 'eu-focus-areas-v1'

export function getFocusAreas() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOCUS_KEY) || '[]') as string[]
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 3) : []
  } catch {
    return []
  }
}

export function setFocusAreas(areas: string[]) {
  const next = [...new Set(areas.filter(Boolean))].slice(0, 3)
  localStorage.setItem(FOCUS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-focus-updated'))
  return next
}

export function deriveContinue(records: StoredRecord[], focusAreas = getFocusAreas()) {
  const now = Date.now()
  return records
    .filter(isRecordVisibleForInsights)
    .filter((record) => record.status === 'active' || record.pinned || record.progressLevel && record.progressLevel !== 'done')
    .map((record) => {
      let score = 0
      if (record.pinned) score += 8
      if (focusAreas.includes(record.area)) score += 5
      if (record.followUpAt && new Date(record.followUpAt).getTime() <= now) score += 6
      if (record.nextMove) score += 3
      if (record.progressLevel && record.progressLevel !== 'done') score += 2
      const age = (now - new Date(record.updatedAt || record.createdAt).getTime()) / 86400000
      if (age <= 7) score += 2
      if (age > 30) score -= 1
      return { record, score }
    })
    .sort((a, b) => b.score - a.score || b.record.createdAt.localeCompare(a.record.createdAt))
    .slice(0, 6)
    .map(({ record }) => record)
}

function dayKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function deriveMoodInsights(moods: MoodCheckin[], records: StoredRecord[]) {
  const recent = moods.filter((item) => new Date(item.date + 'T12:00:00').getTime() >= Date.now() - 30 * 86400000)
  const counts = new Map<MoodValue, number>()
  recent.forEach((item) => counts.set(item.mood, (counts.get(item.mood) || 0) + 1))
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const weekdayCounts = new Map<number, Map<MoodValue, number>>()
  recent.forEach((item) => {
    const weekday = new Date(item.date + 'T12:00:00').getDay()
    const map = weekdayCounts.get(weekday) ?? new Map<MoodValue, number>()
    map.set(item.mood, (map.get(item.mood) || 0) + 1)
    weekdayCounts.set(weekday, map)
  })

  const tiredWeekday = [...weekdayCounts.entries()]
    .map(([weekday, map]) => ({ weekday, tired: map.get('cansado') || 0, total: [...map.values()].reduce((a, b) => a + b, 0) }))
    .filter((item) => item.total >= 2)
    .sort((a, b) => (b.tired / b.total) - (a.tired / a.total))[0]

  const recordsByDay = new Map<string, StoredRecord[]>()
  records.filter(isRecordVisibleForInsights).forEach((record) => {
    const key = dayKey(record.createdAt)
    const current = recordsByDay.get(key) ?? []
    current.push(record)
    recordsByDay.set(key, current)
  })

  const areaByMood = new Map<MoodValue, Map<string, number>>()
  recent.forEach((item) => {
    const map = areaByMood.get(item.mood) ?? new Map<string, number>()
    ;(recordsByDay.get(item.date) ?? []).forEach((record) => map.set(record.area, (map.get(record.area) || 0) + 1))
    areaByMood.set(item.mood, map)
  })

  const topAreaForMood = (mood: MoodValue) => {
    const map = areaByMood.get(mood)
    if (!map) return null
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }

  const pieces: string[] = []
  if (dominant) pieces.push('Seu humor mais registrado nos últimos 30 dias foi ' + moodLabel(dominant) + '.')
  if (tiredWeekday && tiredWeekday.tired >= 2) {
    pieces.push('O cansaço apareceu mais em ' + weekdayLabel(tiredWeekday.weekday) + '.')
  }
  const highArea = topAreaForMood('pilhado') || topAreaForMood('animado')
  if (highArea) pieces.push('Dias de energia mais alta coincidiram bastante com ' + highArea + '.')

  return {
    dominant,
    checkins30: recent.length,
    checkinRate: Math.round((recent.length / 30) * 100),
    tiredWeekday: tiredWeekday?.weekday ?? null,
    highEnergyArea: highArea,
    text: pieces.length ? pieces.join(' ') : 'Ainda faltam alguns check-ins para o EU reconhecer um padrão com confiança.',
  }
}

export function moodLabel(mood: MoodValue) {
  if (mood === 'animado') return 'bem'
  if (mood === 'ok') return 'ok'
  if (mood === 'cansado') return 'cansado'
  return 'pilhado'
}

export function weekdayLabel(day: number) {
  return ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][day] || ''
}

export function deriveWeeklyDigest(records: StoredRecord[], moods: MoodCheckin[]) {
  const cutoff = Date.now() - 7 * 86400000
  const visible = records.filter(isRecordVisibleForInsights)
  const recent = visible.filter((record) => new Date(record.createdAt).getTime() >= cutoff)
  const completed = visible.filter((record) => record.completedAt && new Date(record.completedAt).getTime() >= cutoff)
  const decisions = recent.filter((record) => record.type === 'Decisão')
  const started = recent.filter((record) => record.status === 'active' && record.startedAt)
  const moodRecent = moods.filter((item) => new Date(item.date + 'T12:00:00').getTime() >= cutoff)

  const areaCounts = new Map<string, number>()
  recent.forEach((record) => areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1))
  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const moodCounts = new Map<MoodValue, number>()
  moodRecent.forEach((item) => moodCounts.set(item.mood, (moodCounts.get(item.mood) || 0) + 1))
  const mood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    records: recent.length,
    started: started.length,
    completed: completed.length,
    decisions: decisions.length,
    topArea,
    mood,
    text: [
      topArea ? topArea + ' foi o assunto mais presente' : null,
      completed.length ? completed.length + (completed.length === 1 ? ' ciclo fechou' : ' ciclos fecharam') : null,
      mood ? 'humor mais comum: ' + moodLabel(mood) : null,
    ].filter(Boolean).join(' · ') || 'Uma semana mais quieta no arquivo — e tudo bem.',
  }
}

export function deriveBeforeNow(records: StoredRecord[]) {
  const visible = records.filter(isRecordVisibleForInsights)
  const now = Date.now()
  const current = visible.filter((record) => new Date(record.createdAt).getTime() >= now - 30 * 86400000)
  const previous = visible.filter((record) => {
    const time = new Date(record.createdAt).getTime()
    return time < now - 30 * 86400000 && time >= now - 60 * 86400000
  })

  function summary(items: StoredRecord[]) {
    const areaCounts = new Map<string, number>()
    const tagCounts = new Map<string, number>()
    items.forEach((record) => {
      areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1)
      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1))
    })
    return {
      count: items.length,
      topArea: [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag),
      active: items.filter((record) => record.status === 'active').length,
      completed: items.filter((record) => record.status === 'completed').length,
    }
  }

  return { previous: summary(previous), current: summary(current) }
}

export function deriveLifeStats(records: StoredRecord[], moods: MoodCheckin[]) {
  const visible = records.filter(isRecordVisibleForInsights)
  return {
    total: visible.length,
    active: visible.filter((record) => record.status === 'active').length,
    favorites: visible.filter((record) => record.favorite).length,
    pinned: visible.filter((record) => record.pinned).length,
    completed: visible.filter((record) => record.status === 'completed').length,
    wishes: visible.filter((record) => ['Desejo','Pesquisa','Preferência'].includes(record.type)).length,
    decisions: visible.filter((record) => record.type === 'Decisão').length,
    moods: moods.length,
    areas: new Set(visible.map((record) => record.area)).size,
  }
}

export type SmartCollection = {
  id: string
  title: string
  description: string
  records: StoredRecord[]
  tone: 'cobalt' | 'green' | 'amber' | 'lilac' | 'sky' | 'pink'
}

export function deriveSmartCollections(records: StoredRecord[]): SmartCollection[] {
  const visible = records.filter(isRecordVisibleForInsights)
  const hasLinks = (record: StoredRecord) => (record.attachments ?? []).some((attachment) => attachment.kind === 'link')

  const definitions: Array<Omit<SmartCollection, 'records'> & { pick: (record: StoredRecord) => boolean }> = [
    { id: 'pinned', title: 'Importante agora', description: 'O que você fixou para não perder de vista.', tone: 'cobalt', pick: (r) => Boolean(r.pinned) },
    { id: 'favorites', title: 'Favoritos', description: 'Coisas que você quis guardar bem.', tone: 'lilac', pick: (r) => Boolean(r.favorite) },
    { id: 'wishes', title: 'Quero / estou pesquisando', description: 'Desejos, referências e compras em consideração.', tone: 'amber', pick: (r) => ['Desejo','Pesquisa','Preferência'].includes(r.type) },
    { id: 'decisions', title: 'Decisões importantes', description: 'Escolhas que podem ser revistas com o tempo.', tone: 'green', pick: (r) => r.type === 'Decisão' },
    { id: 'links', title: 'Links salvos', description: 'Referências que entraram com contexto.', tone: 'sky', pick: hasLinks },
    { id: 'chat', title: 'Do Chat', description: 'Coisas das nossas conversas que viraram parte do EU.', tone: 'pink', pick: (r) => r.source === 'chatgpt' },
    { id: 'completed', title: 'Ciclos fechados', description: 'Coisas que chegaram a uma conclusão.', tone: 'green', pick: (r) => r.status === 'completed' },
  ]

  return definitions
    .map((definition) => ({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      tone: definition.tone,
      records: visible.filter(definition.pick),
    }))
    .filter((collection) => collection.records.length)
}

export function crossAppHint(area: string) {
  if (area === 'Dinheiro' || area === 'Compras') return { app: 'Fôlego', id: 'folego' }
  if (area === 'Estudos' || area === 'Carreira') return { app: 'Repertório', id: 'repertorio' }
  if (area === 'Pessoal' || area === 'Lazer') return { app: 'Traço', id: 'traco' }
  return null
}
