import type { StoredRecord } from './storage'

const stopwords = new Set([
  'qual','era','aquele','aquela','que','eu','o','a','os','as','de','do','da','dos','das',
  'um','uma','uns','umas','me','meu','minha','meus','minhas','sobre','já','ja','falei',
  'quando','onde','como','foi','estava','estou','quero','queria','procuro','procura',
])

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function smartSearch(records: StoredRecord[], query: string) {
  const normalized = normalize(query.trim())
  if (!normalized) return records

  const tokens = normalized
    .replace(/[^a-z0-9#\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopwords.has(token))

  if (!tokens.length) return records

  return records
    .map((record) => {
      const haystack = normalize([
        record.text,
        record.type,
        record.area,
        ...(record.tags ?? []),
        record.journeyStage ?? '',
        record.source ?? '',
      ].join(' '))

      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
      return { record, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ record }) => record)
}

export type PersonalPattern = {
  id: string
  title: string
  detail: string
  tone: 'coral' | 'green' | 'amber' | 'pink'
}

export function derivePatterns(records: StoredRecord[]): PersonalPattern[] {
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = records.filter((record) => new Date(record.createdAt).getTime() >= recentCutoff)
  const patterns: PersonalPattern[] = []

  const areaCounts = new Map<string, number>()
  recent.forEach((record) => areaCounts.set(record.area, (areaCounts.get(record.area) ?? 0) + 1))
  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topArea && topArea[1] >= 3) {
    patterns.push({
      id: 'top-area',
      title: topArea[0] + ' está aparecendo bastante.',
      detail: topArea[1] + ' registros dessa área entraram no EU nos últimos 30 dias.',
      tone: topArea[0] === 'Carreira' ? 'green' : topArea[0] === 'Compras' ? 'pink' : 'amber',
    })
  }

  const tagCounts = new Map<string, number>()
  recent.forEach((record) => (record.tags ?? []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)))
  const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topTag && topTag[1] >= 3) {
    patterns.push({
      id: 'top-tag',
      title: '#' + topTag[0] + ' virou um tema recorrente.',
      detail: 'Esse assunto apareceu ' + topTag[1] + ' vezes recentemente.',
      tone: 'amber',
    })
  }

  const completed = recent.filter((record) => record.status === 'completed').length
  if (completed >= 2) {
    patterns.push({
      id: 'completed',
      title: 'Você está fechando ciclos.',
      detail: completed + ' coisas foram concluídas nos últimos 30 dias.',
      tone: 'green',
    })
  }

  const oldActive = records.filter((record) =>
    record.status === 'active'
    && new Date(record.startedAt || record.createdAt).getTime() < Date.now() - 21 * 24 * 60 * 60 * 1000,
  )
  if (oldActive.length) {
    patterns.push({
      id: 'stale',
      title: oldActive.length === 1 ? 'Tem uma coisa pedindo uma decisão.' : oldActive.length + ' coisas estão há um tempo sem fechar.',
      detail: 'Talvez valha concluir, pausar, abandonar ou escolher um próximo movimento.',
      tone: 'coral',
    })
  }

  const favorites = records.filter((record) => record.favorite).length
  if (favorites >= 3) {
    patterns.push({
      id: 'favorites',
      title: 'Seu mapa de referências está ficando mais claro.',
      detail: favorites + ' registros já foram marcados como favoritos.',
      tone: 'pink',
    })
  }

  return patterns.slice(0, 3)
}

export function reviewCandidates(records: StoredRecord[]) {
  const now = Date.now()
  return records
    .filter((record) => {
      const ageDays = (now - new Date(record.updatedAt || record.createdAt).getTime()) / 86400000
      if (record.status === 'active' && ageDays >= 7) return true
      if (['Desejo', 'Pesquisa', 'Preferência'].includes(record.type) && ageDays >= 21) return true
      if (record.pinned && ageDays >= 14) return true
      return false
    })
    .sort((a, b) => new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime())
    .slice(0, 12)
}

export function groupTimeline(records: StoredRecord[]) {
  const groups = new Map<string, StoredRecord[]>()

  records.forEach((record) => {
    const date = new Date(record.createdAt)
    const key = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
    const current = groups.get(key) ?? []
    current.push(record)
    groups.set(key, current)
  })

  return [...groups.entries()].map(([label, items]) => ({ label, items }))
}
