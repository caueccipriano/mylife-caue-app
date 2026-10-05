import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { deriveWaiting, isWaitingRecord } from './lifeOSIntelligence'

const DAY = 86400000

function lower(value?: string) {
  return (value || '').toLocaleLowerCase('pt-BR')
}

function stamp(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

function visible(records: StoredRecord[]) {
  return records.filter((record) => isRecordVisibleForInsights(record))
}

function active(record: StoredRecord) {
  return record.status !== 'completed' && record.status !== 'abandoned' && record.status !== 'paused'
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

export type AttentionBudget = {
  level: 'quiet' | 'balanced' | 'loaded'
  label: string
  headline: string
  detail: string
  openCount: number
  overdueCount: number
  waitingCount: number
  activeAreas: number
}

export type Commitment = {
  id: string
  direction: 'mine' | 'theirs'
  record: StoredRecord
  reason: string
}

export type LifeChange = {
  id: string
  kind: 'new' | 'completed' | 'updated' | 'decision'
  record: StoredRecord
  at: string
  label: string
}

export type FrictionSignal = {
  id: string
  record: StoredRecord
  reason: string
  level: 'low' | 'medium' | 'high'
}

export type OpportunitySignal = {
  id: string
  record: StoredRecord
  reason: string
}

export type DecisionEntry = {
  id: string
  record: StoredRecord
  state: 'open' | 'learned' | 'review'
  note: string
}

export type PersonalApiSnapshot = {
  generatedAt: string
  counts: {
    openLoops: number
    waiting: number
    decisions: number
    goals: number
    projects: number
  }
  attention: AttentionBudget
  topAreas: Array<{ area: string; count: number }>
  recentDecisions: Array<{ id: string; text: string; area: string; outcome?: StoredRecord['outcome']; expectation?: string }>
  waiting: Array<{ id: string; text: string; area: string; followUpAt?: string }>
}

export function deriveOpenLoops(records: StoredRecord[]) {
  return visible(records)
    .filter(active)
    .filter((record) => !record.someday)
    .sort((a, b) => {
      const aDue = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      return aDue - bDue || stamp(b) - stamp(a)
    })
}

export function deriveCommitments(records: StoredRecord[]): Commitment[] {
  const mine = [
    'eu prometi', 'prometi ', 'eu disse que', 'tenho que mandar', 'tenho de mandar',
    'vou enviar', 'vou mandar', 'preciso retornar', 'preciso responder', 'ficou comigo',
  ]
  const theirs = [
    'ficou de ', 'vai me retornar', 'vai retornar', 'aguardando retorno', 'aguardando resposta',
    'esperando resposta', 'esperando retorno', 'me prometeu', 'disse que ia', 'depende de ',
  ]

  return visible(records)
    .filter(active)
    .flatMap((record) => {
      const haystack = lower(record.type + ' ' + record.text + ' ' + (record.nextMove || ''))
      if (includesAny(haystack, mine)) return [{ id: 'mine:' + record.id, direction: 'mine' as const, record, reason: 'um compromisso seu ainda está aberto' }]
      if (includesAny(haystack, theirs) || isWaitingRecord(record)) return [{ id: 'theirs:' + record.id, direction: 'theirs' as const, record, reason: 'algo foi prometido ou depende de outra pessoa' }]
      return []
    })
    .sort((a, b) => stamp(b.record) - stamp(a.record))
}

export function deriveDecisionJournal(records: StoredRecord[]): DecisionEntry[] {
  return visible(records)
    .filter((record) => lower(record.type).includes('decis'))
    .sort((a, b) => stamp(b) - stamp(a))
    .map((record) => {
      if (record.outcome && record.outcome !== 'unknown') {
        return {
          id: record.id,
          record,
          state: 'learned' as const,
          note: record.outcome === 'good' ? 'resultado registrado como bom' : record.outcome === 'regret' ? 'virou aprendizado por arrependimento' : 'resultado misto registrado',
        }
      }
      if (record.expectation) {
        return { id: record.id, record, state: 'review' as const, note: 'há uma expectativa registrada; vale comparar com o que aconteceu' }
      }
      return { id: record.id, record, state: 'open' as const, note: 'decisão guardada, ainda sem avaliação de resultado' }
    })
}

export function deriveWhatChanged(records: StoredRecord[], days = 7): LifeChange[] {
  const cutoff = Date.now() - days * DAY
  const result: LifeChange[] = []

  visible(records).forEach((record) => {
    const created = new Date(record.createdAt).getTime()
    const updatedValue = record.updatedAt || record.createdAt
    const updated = new Date(updatedValue).getTime()
    const completed = record.completedAt ? new Date(record.completedAt).getTime() : 0

    if (completed >= cutoff) {
      result.push({ id: 'completed:' + record.id, kind: 'completed', record, at: record.completedAt as string, label: 'foi concluído' })
      return
    }

    if (created >= cutoff) {
      result.push({
        id: 'new:' + record.id,
        kind: lower(record.type).includes('decis') ? 'decision' : 'new',
        record,
        at: record.createdAt,
        label: lower(record.type).includes('decis') ? 'uma decisão entrou no sistema' : 'entrou no seu EU',
      })
      return
    }

    if (updated >= cutoff && updated > created + 60000) {
      result.push({ id: 'updated:' + record.id, kind: 'updated', record, at: updatedValue, label: 'mudou recentemente' })
    }
  })

  return result.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 16)
}

export function deriveAttentionBudget(records: StoredRecord[], inboxCount = 0): AttentionBudget {
  const open = deriveOpenLoops(records)
  const waiting = deriveWaiting(records)
  const now = Date.now()
  const overdue = open.filter((record) => record.followUpAt && new Date(record.followUpAt).getTime() <= now && !isWaitingRecord(record))
  const activeAreas = new Set(open.map((record) => record.area).filter(Boolean)).size
  const stale = open.filter((record) => stamp(record) < now - 21 * DAY && !isWaitingRecord(record)).length

  const pressure = overdue.length * 3 + Math.min(open.length, 12) + Math.max(0, activeAreas - 3) * 2 + Math.min(inboxCount, 5) + Math.min(stale, 4)

  if (pressure <= 7) {
    return {
      level: 'quiet',
      label: 'leve',
      headline: 'Você tem espaço mental disponível.',
      detail: 'Poucas frentes disputam atenção agora. Não há motivo para inventar trabalho.',
      openCount: open.length,
      overdueCount: overdue.length,
      waitingCount: waiting.length,
      activeAreas,
    }
  }

  if (pressure <= 16) {
    return {
      level: 'balanced',
      label: 'equilibrado',
      headline: 'Cabe avançar, mas sem abrir muitas frentes novas.',
      detail: 'Seu sistema tem movimento suficiente para pedir alguma escolha de prioridade.',
      openCount: open.length,
      overdueCount: overdue.length,
      waitingCount: waiting.length,
      activeAreas,
    }
  }

  return {
    level: 'loaded',
    label: 'carregado',
    headline: 'Seu problema agora pode ser excesso de frentes, não falta de tempo.',
    detail: 'Vale fechar, pausar ou delegar antes de adicionar mais coisas ao radar.',
    openCount: open.length,
    overdueCount: overdue.length,
    waitingCount: waiting.length,
    activeAreas,
  }
}

export function deriveFrictionMap(records: StoredRecord[]): FrictionSignal[] {
  const now = Date.now()

  return deriveOpenLoops(records)
    .flatMap((record) => {
      const age = now - stamp(record)
      const revisions = record.revisions?.length || 0
      const noNext = !record.nextMove?.trim()
      const signals: string[] = []

      if (age > 30 * DAY) signals.push('está aberto há bastante tempo')
      if (revisions >= 3) signals.push('já foi reformulado várias vezes')
      if (noNext && age > 14 * DAY) signals.push('não tem próximo passo claro')
      if (record.followUpAt && new Date(record.followUpAt).getTime() < now - 7 * DAY) signals.push('o retorno ficou vencido')

      if (!signals.length) return []
      return [{
        id: record.id,
        record,
        reason: signals.join(' · '),
        level: signals.length >= 3 ? 'high' as const : signals.length === 2 ? 'medium' as const : 'low' as const,
      }]
    })
    .sort((a, b) => ['high', 'medium', 'low'].indexOf(a.level) - ['high', 'medium', 'low'].indexOf(b.level))
    .slice(0, 8)
}

export function deriveOpportunities(records: StoredRecord[]): OpportunitySignal[] {
  const terms = ['oportunidade', 'vaga', 'curso', 'bolsa', 'convite', 'desconto', 'promoção', 'promocao', 'freela', 'freelance', 'cliente', 'entrevista']

  return visible(records)
    .filter(active)
    .filter((record) => {
      const haystack = lower([record.type, record.text, record.area, ...(record.tags || [])].join(' '))
      return includesAny(haystack, terms)
    })
    .sort((a, b) => stamp(b) - stamp(a))
    .slice(0, 8)
    .map((record) => ({ id: record.id, record, reason: 'isso pode alterar uma decisão ou abrir um caminho novo' }))
}

export function deriveSomeday(records: StoredRecord[]) {
  return visible(records)
    .filter((record) => record.someday || (active(record) && includesAny(lower(record.type), ['desejo', 'ideia', 'futuro'])))
    .sort((a, b) => stamp(b) - stamp(a))
}

export function deriveNoActionNeeded(records: StoredRecord[]) {
  const now = Date.now()
  return visible(records)
    .filter(active)
    .filter((record) => isWaitingRecord(record) || Boolean(record.followUpAt && new Date(record.followUpAt).getTime() > now + DAY))
    .sort((a, b) => stamp(b) - stamp(a))
    .slice(0, 8)
}

export function deriveCounterfactuals(records: StoredRecord[]) {
  return deriveDecisionJournal(records)
    .filter((entry) => entry.record.expectation && (!entry.record.outcome || entry.record.outcome === 'unknown' || entry.record.outcome === 'mixed'))
    .slice(0, 6)
    .map((entry) => ({
      id: entry.id,
      record: entry.record,
      prompt: 'Você esperava: “' + (entry.record.expectation || '') + '”. O resultado real já pode ser comparado?',
    }))
}

export function deriveStateOfMe(records: StoredRecord[]) {
  const recent = visible(records).filter((record) => stamp(record) >= Date.now() - 30 * DAY)
  const counts = new Map<string, number>()

  recent.forEach((record) => {
    const area = record.area || 'Outros'
    counts.set(area, (counts.get(area) || 0) + 1)
  })

  const topAreas = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area, count]) => ({ area, count }))

  const open = deriveOpenLoops(records)
  const decisions = deriveDecisionJournal(records).filter((entry) => stamp(entry.record) >= Date.now() - 30 * DAY)
  const lead = topAreas[0]?.area

  const headline = lead
    ? 'Sua atenção recente está mais concentrada em ' + lead + '.'
    : 'Seu EU está em uma fase mais quieta.'

  const detail = open.length
    ? open.length + (open.length === 1 ? ' história continua aberta' : ' histórias continuam abertas') + ' e ' + decisions.length + (decisions.length === 1 ? ' decisão entrou' : ' decisões entraram') + ' nos últimos 30 dias.'
    : 'Poucas frentes seguem abertas. Essa também pode ser uma fase válida.'

  return { headline, detail, topAreas, openCount: open.length, decisionCount: decisions.length }
}

export function searchLife(records: StoredRecord[], query: string) {
  const q = lower(query.trim())
  if (!q) return []

  return visible(records)
    .map((record) => {
      const fields = [
        record.text,
        record.type,
        record.area,
        record.whyItMatters,
        record.nextMove,
        record.expectation,
        record.objectName,
        record.place,
        ...(record.tags || []),
      ].filter(Boolean).join(' ')
      const haystack = lower(fields)
      const direct = haystack.includes(q)
      const words = q.split(/\s+/).filter(Boolean)
      const wordMatches = words.filter((word) => haystack.includes(word)).length
      const score = direct ? 100 + wordMatches : wordMatches
      return { record, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || stamp(b.record) - stamp(a.record))
    .slice(0, 20)
    .map((item) => item.record)
}

export function buildPersonalApiSnapshot(records: StoredRecord[], inboxCount = 0): PersonalApiSnapshot {
  const usable = visible(records)
  const open = deriveOpenLoops(usable)
  const waiting = deriveWaiting(usable)
  const decisions = deriveDecisionJournal(usable)
  const goals = usable.filter((record) => active(record) && includesAny(lower(record.type), ['objetivo', 'meta']))
  const projects = usable.filter((record) => active(record) && lower(record.type).includes('projeto'))
  const state = deriveStateOfMe(usable)

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      openLoops: open.length,
      waiting: waiting.length,
      decisions: decisions.length,
      goals: goals.length,
      projects: projects.length,
    },
    attention: deriveAttentionBudget(usable, inboxCount),
    topAreas: state.topAreas,
    recentDecisions: decisions.slice(0, 5).map((entry) => ({
      id: entry.record.id,
      text: entry.record.text,
      area: entry.record.area,
      outcome: entry.record.outcome,
      expectation: entry.record.expectation,
    })),
    waiting: waiting.slice(0, 5).map((record) => ({
      id: record.id,
      text: record.text,
      area: record.area,
      followUpAt: record.followUpAt,
    })),
  }
}

export type CommandIntent =
  | { kind: 'search'; query: string }
  | { kind: 'money'; query: string }
  | { kind: 'capture'; query: string; type: string; area: string }

export function parseLifeCommand(input: string): CommandIntent {
  const value = input.trim()
  const normalized = lower(value)

  if (includesAny(normalized, ['gastei ', 'paguei ', 'recebi ', 'salário ', 'salario ', 'r$ ', 'reais'])) {
    return { kind: 'money', query: value }
  }

  if (includesAny(normalized, ['buscar ', 'procura ', 'onde está ', 'onde esta ', 'ache ', 'encontre '])) {
    return { kind: 'search', query: value.replace(/^(buscar|procura|onde está|onde esta|ache|encontre)\s+/i, '') }
  }

  const decision = includesAny(normalized, ['decidi ', 'decisão ', 'decisao '])
  const project = includesAny(normalized, ['projeto ', 'comecei ', 'estou criando ', 'estou fazendo '])
  const goal = includesAny(normalized, ['quero ', 'meta ', 'objetivo '])

  return {
    kind: 'capture',
    query: value,
    type: decision ? 'Decisão' : project ? 'Projeto' : goal ? 'Objetivo' : 'Memória',
    area: 'Pessoal',
  }
}
