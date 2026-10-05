import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { deriveDriftSignalsCore, isWaitingText, routeLifeOSContext, type DriftSignal } from './lifeOSRules'

export { routeLifeOSContext }

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
  return isWaitingText(record.type, record.text)
}

export function deriveWaiting(records: StoredRecord[]) {
  return records
    .filter((record) => isRecordVisibleForInsights(record))
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
    .filter((record) => isRecordVisibleForInsights(record))
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
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
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
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
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


export type LifeOSScout = {
  id: string
  level: 'low' | 'medium' | 'high'
  title: string
  detail: string
  actionUrl?: string
  reason: string
}

export function deriveLifeOSScouts(records: StoredRecord[], inboxCount: number): LifeOSScout[] {
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
  const waiting = deriveWaiting(visible)
  const now = Date.now()
  const scouts: LifeOSScout[] = []

  visible
    .filter((record) => record.status === 'active' && record.followUpAt && new Date(record.followUpAt).getTime() <= now)
    .forEach((record) => {
      const waitingOnSomeone = isWaitingRecord(record)
      scouts.push({
        id: 'due:' + record.id,
        level: waitingOnSomeone ? 'medium' : 'high',
        title: waitingOnSomeone ? 'Vale conferir se houve retorno' : 'Isso já voltou para você',
        detail: record.text,
        actionUrl: '/registro/' + record.id,
        reason: waitingOnSomeone ? 'dependência externa com data de conferência vencida' : 'próxima ação vencida',
      })
    })

  visible
    .filter((record) => record.status === 'active' && ts(record) < now - 21 * 86400000 && !record.followUpAt && !isWaitingRecord(record))
    .slice(0, 4)
    .forEach((record) => scouts.push({
      id: 'stale:' + record.id,
      level: 'medium',
      title: 'Uma frente ficou quieta',
      detail: record.text,
      actionUrl: '/registro/' + record.id,
      reason: 'ativa, mas sem movimento há mais de 3 semanas',
    }))

  visible
    .filter((record) => lower(record.type).includes('projeto') && record.status === 'active' && !record.nextMove)
    .slice(0, 3)
    .forEach((record) => scouts.push({
      id: 'next:' + record.id,
      level: 'low',
      title: 'Projeto sem próximo passo claro',
      detail: record.text,
      actionUrl: '/registro/' + record.id,
      reason: 'projeto ativo sem nextMove registrado',
    }))

  if (inboxCount > 0) {
    scouts.push({
      id: 'inbox',
      level: inboxCount >= 5 ? 'medium' : 'low',
      title: 'A entrada está acumulando',
      detail: inboxCount + (inboxCount === 1 ? ' entrada espera revisão.' : ' entradas esperam revisão.'),
      actionUrl: '/inbox',
      reason: 'informação nova ainda não foi roteada para o sistema',
    })
  }

  if (waiting.length >= 5) {
    scouts.push({
      id: 'waiting-volume',
      level: 'low',
      title: 'Muitas coisas estão nas mãos de terceiros',
      detail: waiting.length + ' dependências externas estão sendo acompanhadas.',
      actionUrl: '/sistema#aguardando',
      reason: 'volume alto de itens em espera',
    })
  }

  const rank = { high: 0, medium: 1, low: 2 } as const
  return scouts
    .sort((a, b) => rank[a.level] - rank[b.level])
    .slice(0, 8)
}

export function buildContextBootstrap(records: StoredRecord[]) {
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
  const recentCutoff = Date.now() - 14 * 86400000
  const activeProjects = visible
    .filter((record) => record.status === 'active' && lower(record.type).includes('projeto'))
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 5)
  const recentDecisions = visible
    .filter((record) => lower(record.type).includes('decis') && ts(record) >= recentCutoff)
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 5)
  const waiting = deriveWaiting(visible).slice(0, 5)
  const carryOver = deriveCarryOver(visible).slice(0, 5)

  return {
    generatedAt: new Date().toISOString(),
    activeProjects: activeProjects.map((record) => ({ id: record.id, text: record.text, area: record.area, nextMove: record.nextMove })),
    recentDecisions: recentDecisions.map((record) => ({ id: record.id, text: record.text, area: record.area, outcome: record.outcome })),
    waiting: waiting.map((record) => ({ id: record.id, text: record.text, area: record.area, followUpAt: record.followUpAt })),
    carryOver: carryOver.map((record) => ({ id: record.id, text: record.text, area: record.area, nextMove: record.nextMove })),
  }
}


export function deriveProjectHandoff(project: StoredRecord, records: StoredRecord[]) {
  const relatedSet = new Set(project.relatedIds || [])
  const related = records
    .filter((record) => record.id !== project.id)
    .filter((record) => relatedSet.has(record.id) || (record.relatedIds || []).includes(project.id))
    .filter((record) => isRecordVisibleForInsights(record))
    .sort((a, b) => ts(b) - ts(a))

  const decisions = related
    .filter((record) => lower(record.type).includes('decis'))
    .slice(0, 3)
  const open = related
    .filter((record) => record.status === 'active' && !isWaitingRecord(record))
    .slice(0, 3)
  const waiting = related
    .filter(isWaitingRecord)
    .slice(0, 3)
  const latest = related[0]

  return {
    lastMovement: latest?.text || project.text,
    lastMovementAt: latest?.updatedAt || latest?.createdAt || project.updatedAt || project.createdAt,
    decisions,
    open,
    waiting,
    nextMove: project.nextMove || open[0]?.nextMove || open[0]?.text || '',
    relatedCount: related.length,
  }
}


export function deriveDriftSignals(records: StoredRecord[], focusAreas: string[]): DriftSignal[] {
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
  return deriveDriftSignalsCore(visible, focusAreas)
}

export function deriveCrossSignals(records: StoredRecord[]) {
  const visible = records.filter((record) => isRecordVisibleForInsights(record))
  const signals: Array<{ id: string; title: string; detail: string; recordIds: string[] }> = []
  const applications = visible.filter((record) => lower(record.type).includes('candidatura') && record.status === 'active')
  const careerWaiting = deriveWaiting(visible).filter((record) => record.area === 'Carreira')

  applications.slice(0, 4).forEach((application) => {
    const relatedWaiting = careerWaiting.find((record) =>
      record.id !== application.id
      && ((application.relatedIds || []).includes(record.id) || (record.relatedIds || []).includes(application.id)),
    )
    if (relatedWaiting) {
      signals.push({
        id: 'application-wait:' + application.id,
        title: 'Candidatura + retorno pendente',
        detail: 'Uma candidatura está conectada a algo que depende de resposta externa.',
        recordIds: [application.id, relatedWaiting.id],
      })
    }
  })

  const goals = visible.filter((record) => lower(record.type).includes('objetivo') && record.status === 'active')
  goals.slice(0, 5).forEach((goal) => {
    const related = visible.filter((record) =>
      record.id !== goal.id
      && ((goal.relatedIds || []).includes(record.id) || (record.relatedIds || []).includes(goal.id)),
    )
    const latest = related.sort((a, b) => ts(b) - ts(a))[0]
    if (latest && ts(latest) >= Date.now() - 14 * 86400000) {
      signals.push({
        id: 'goal-motion:' + goal.id,
        title: 'Um objetivo ganhou movimento',
        detail: goal.text + ' está conectado a uma atualização recente: ' + latest.text,
        recordIds: [goal.id, latest.id],
      })
    }
  })

  return signals.slice(0, 4)
}
