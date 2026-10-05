import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'

function lower(value?: string) {
  return (value || '').toLowerCase()
}

function ts(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export function isWaitingRecord(record: StoredRecord) {
  const type = lower(record.type)
  const text = lower(record.text)
  if (type.includes('aguardando') || type.includes('espera')) return true
  return [
    'aguardando retorno',
    'aguardando resposta',
    'esperando retorno',
    'esperando resposta',
    'ficou de me responder',
    'ficou de responder',
    'dependendo de',
    'à espera de',
    'a espera de',
  ].some((term) => text.includes(term))
}

export function deriveWaiting(records: StoredRecord[]) {
  return records
    .filter(isRecordVisibleForInsights)
    .filter((record) => record.status !== 'completed' && record.status !== 'abandoned')
    .filter(isWaitingRecord)
    .sort((a, b) => {
      const af = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      const bf = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      return af - bf || ts(b) - ts(a)
    })
}

export function deriveCarryOver(records: StoredRecord[]) {
  const today = startOfToday()
  return records
    .filter(isRecordVisibleForInsights)
    .filter((record) => record.status === 'active')
    .filter((record) => !isWaitingRecord(record))
    .filter((record) => ts(record) < today)
    .filter((record) => Boolean(record.nextMove || record.followUpAt || record.pinned))
    .sort((a, b) => {
      const aDue = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      return aDue - bDue || ts(b) - ts(a)
    })
}

export function buildMorningIntelligence(records: StoredRecord[], inboxCount: number) {
  const visible = records.filter(isRecordVisibleForInsights)
  const waiting = deriveWaiting(visible)
  const carryOver = deriveCarryOver(visible)
  const now = Date.now()
  const overdue = visible.filter((record) =>
    record.status === 'active'
    && record.followUpAt
    && new Date(record.followUpAt).getTime() <= now
    && !isWaitingRecord(record),
  )
  const stale = visible.filter((record) =>
    record.status === 'active'
    && ts(record) < now - 21 * 86400000
    && !isWaitingRecord(record),
  )

  const parts: string[] = []
  if (overdue.length) parts.push(overdue.length + (overdue.length === 1 ? ' coisa pede ação' : ' coisas pedem ação'))
  if (waiting.length) parts.push(waiting.length + (waiting.length === 1 ? ' coisa depende de alguém' : ' coisas dependem de alguém'))
  if (inboxCount) parts.push(inboxCount + (inboxCount === 1 ? ' entrada nova' : ' entradas novas'))
  if (!parts.length && carryOver.length) parts.push(carryOver.length + (carryOver.length === 1 ? ' continuidade de ontem' : ' continuidades de ontem'))

  const headline = parts.length
    ? parts.slice(0, 2).join(' · ')
    : 'Nada urgente disputando sua atenção.'

  const note = stale.length
    ? stale.length + (stale.length === 1 ? ' frente está parada há mais de 3 semanas.' : ' frentes estão paradas há mais de 3 semanas.')
    : carryOver.length
      ? 'O que não terminou continua disponível sem virar culpa.'
      : 'O sistema está leve. Você pode escolher uma coisa importante e seguir.'

  return {
    headline,
    note,
    waitingCount: waiting.length,
    carryOverCount: carryOver.length,
    overdueCount: overdue.length,
    inboxCount,
    staleCount: stale.length,
  }
}

export function buildWeeklyReset(records: StoredRecord[]) {
  const visible = records.filter(isRecordVisibleForInsights)
  const now = Date.now()
  const week = now - 7 * 86400000
  const completed = visible.filter((record) => {
    if (record.status !== 'completed') return false
    return new Date(record.completedAt || record.updatedAt || record.createdAt).getTime() >= week
  })
  const newRecords = visible.filter((record) => new Date(record.createdAt).getTime() >= week)
  const decisions = newRecords.filter((record) => lower(record.type).includes('decis'))
  const waiting = deriveWaiting(visible)
  const carryOver = deriveCarryOver(visible)

  return {
    completed: completed.length,
    captured: newRecords.length,
    decisions: decisions.length,
    waiting: waiting.length,
    carryOver: carryOver.length,
    sentence: completed.length
      ? 'Você fechou ' + completed.length + (completed.length === 1 ? ' coisa nesta semana.' : ' coisas nesta semana.')
      : newRecords.length
        ? 'A semana ganhou contexto. Agora vale escolher o que continua.'
        : 'Semana quieta no arquivo. Uma revisão curta já basta.',
  }
}
