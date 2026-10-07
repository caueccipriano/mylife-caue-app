import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import type { EuIconName } from './v2Ui'

export type MemoryInsight = {
  id: string
  eyebrow: string
  title: string
  detail: string
  icon: EuIconName
  route: string
  score: number
}

function timestamp(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function deriveMemoryInsights(records: StoredRecord[]): MemoryInsight[] {
  const visible = records.filter(isRecordVisibleForInsights)
  const insights: MemoryInsight[] = []
  const tags = new Map<string, StoredRecord[]>()

  visible.forEach((record) => {
    ;(record.tags || []).forEach((tag) => {
      const key = normalize(tag)
      if (!key || key === normalize(record.area)) return
      const list = tags.get(key) || []
      list.push(record)
      tags.set(key, list)
    })
  })

  ;[...tags.entries()]
    .filter(([, items]) => items.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .forEach(([tag, items], index) => {
      const ordered = [...items].sort((a, b) => timestamp(b) - timestamp(a))
      const spanDays = Math.max(1, Math.round((timestamp(ordered[0]) - timestamp(ordered[ordered.length - 1])) / 86400000))
      insights.push({
        id: 'repeat:' + tag,
        eyebrow: 'TEMA RECORRENTE',
        title: 'Você volta a ' + tag + '.',
        detail: items.length + ' registros ao longo de ' + spanDays + ' dias. Isso parece ser mais que uma curiosidade passageira.',
        icon: 'refresh',
        route: '/buscar?q=' + encodeURIComponent(tag),
        score: 90 - index,
      })
    })

  const areas = new Map<string, StoredRecord[]>()
  visible.forEach((record) => {
    const list = areas.get(record.area) || []
    list.push(record)
    areas.set(record.area, list)
  })

  ;[...areas.entries()].forEach(([area, items]) => {
    const now = Date.now()
    const recent = items.filter((item) => timestamp(item) >= now - 30 * 86400000).length
    const previous = items.filter((item) => timestamp(item) < now - 30 * 86400000 && timestamp(item) >= now - 60 * 86400000).length
    if (recent >= 3 && recent >= Math.max(2, previous * 2)) {
      insights.push({
        id: 'area-rise:' + area,
        eyebrow: 'MUDANÇA DE FASE',
        title: area + ' ganhou mais espaço no seu arquivo.',
        detail: recent + ' registros nos últimos 30 dias' + (previous ? ', contra ' + previous + ' nos 30 dias anteriores.' : '.'),
        icon: 'trend-up',
        route: '/vida/area/' + normalize(area).replace(/\s+/g, '-'),
        score: 78 + Math.min(8, recent),
      })
    }
  })

  const decisions = visible
    .filter((record) => normalize(record.type).includes('decis'))
    .sort((a, b) => timestamp(b) - timestamp(a))

  decisions.slice(0, 5).forEach((decision, index) => {
    const later = visible
      .filter((record) => record.id !== decision.id && record.area === decision.area)
      .filter((record) => timestamp(record) >= timestamp(decision))
      .filter((record) => record.status === 'active' || record.status === 'completed')
      .sort((a, b) => timestamp(b) - timestamp(a))[0]
    if (!later) return
    insights.push({
      id: 'decision:' + decision.id,
      eyebrow: 'DECISÃO → MOVIMENTO',
      title: 'Uma decisão em ' + decision.area + ' teve continuação.',
      detail: '“' + decision.text.slice(0, 72) + (decision.text.length > 72 ? '…' : '') + '” reaparece no movimento que veio depois.',
      icon: 'check',
      route: '/registro/' + later.id,
      score: 82 - index,
    })
  })

  const seen = new Set<string>()
  return insights
    .filter((item) => {
      const key = normalize(item.title)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}
