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
  const commitments: Commitment[] = []

  visible(records)
    .filter(active)
    .forEach((record) => {
      const haystack = lower(record.type + ' ' + record.text + ' ' + (record.nextMove || ''))
      if (includesAny(haystack, mine)) {
        commitments.push({
          id: 'mine:' + record.id,
          direction: 'mine',
          record,
          reason: 'um compromisso seu ainda está aberto',
        })
        return
      }
      if (includesAny(haystack, theirs) || isWaitingRecord(record)) {
        commitments.push({
          id: 'theirs:' + record.id,
          direction: 'theirs',
          record,
          reason: 'algo foi prometido ou depende de outra pessoa',
        })
      }
    })

  return commitments.sort((a, b) => stamp(b.record) - stamp(a.record))
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

export function deriveNightBrief(records: StoredRecord[]) {
  const usable = visible(records)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const today = usable.filter((record) => Math.max(new Date(record.createdAt).getTime(), stamp(record)) >= start)
  const completed = usable.filter((record) => record.completedAt && new Date(record.completedAt).getTime() >= start)
  const decisions = today.filter((record) => lower(record.type).includes('decis'))
  const waiting = deriveWaiting(usable)
  const stillOpen = deriveOpenLoops(usable).filter((record) => !isWaitingRecord(record))

  let headline = 'Hoje foi um dia quieto no seu EU.'
  if (completed.length) headline = 'Você fechou ' + completed.length + (completed.length === 1 ? ' coisa hoje.' : ' coisas hoje.')
  else if (decisions.length) headline = 'Hoje teve decisão: ' + decisions.length + (decisions.length === 1 ? ' escolha entrou no sistema.' : ' escolhas entraram no sistema.')
  else if (today.length) headline = today.length + (today.length === 1 ? ' movimento entrou no seu EU hoje.' : ' movimentos entraram no seu EU hoje.')

  return {
    headline,
    captured: today.length,
    completed: completed.length,
    decisions: decisions.length,
    waiting: waiting.length,
    carryToTomorrow: stillOpen.slice(0, 3),
    note: stillOpen.length
      ? 'O que ficou aberto continua amanhã sem precisar ser recadastrado.'
      : 'Nada precisa ser carregado para amanhã agora.',
  }
}

export function deriveWeekLens(records: StoredRecord[]) {
  const usable = visible(records)
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(start.getTime() + index * DAY)
    const dayEnd = new Date(dayStart.getTime() + DAY)
    const scheduled = usable.filter((record) => {
      const values = [record.followUpAt, record.revealAt].filter(Boolean) as string[]
      return values.some((value) => {
        const time = new Date(value).getTime()
        return time >= dayStart.getTime() && time < dayEnd.getTime()
      })
    })
    const action = scheduled.filter((record) => !isWaitingRecord(record))
    const waiting = scheduled.filter(isWaitingRecord)

    return {
      date: dayStart.toISOString(),
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dayStart).replace('.', ''),
      action: action.length,
      waiting: waiting.length,
      total: scheduled.length,
    }
  })

  const total = days.reduce((sum, day) => sum + day.total, 0)
  const peak = [...days].sort((a, b) => b.action - a.action)[0]
  const level = total <= 3 ? 'light' : total <= 8 ? 'balanced' : 'busy'

  return {
    days,
    total,
    level,
    headline: total === 0
      ? 'A semana está aberta — nenhum retorno importante está marcado.'
      : peak.action >= 3
        ? 'Sua semana concentra mais coisas em ' + peak.label + '.'
        : 'A semana está distribuída sem um pico forte de atenção.',
    note: level === 'busy'
      ? 'Talvez valha evitar abrir novas frentes até algumas coisas fecharem.'
      : level === 'balanced'
        ? 'Há movimento, mas ainda existe espaço para escolher uma prioridade por vez.'
        : 'Pouca coisa está marcada no tempo. Não precisa preencher o espaço só porque ele existe.',
  }
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
  | { kind: 'reminder'; query: string; area: string; followUpAt: string; followUpDays: number }
  | { kind: 'complete'; query: string }
  | { kind: 'pause'; query: string }

function commandAscii(value: string) {
  return lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function commandArea(value: string) {
  const q = commandAscii(value)
  if (includesAny(q, ['trabalho', 'carreira', 'vaga', 'entrevista', 'curriculo', 'promocao', 'power bi', 'sap', 'sql', 'dados'])) return 'Carreira'
  if (includesAny(q, ['curso', 'faculdade', 'estudo', 'prova', 'idioma', 'aula', 'certificacao'])) return 'Estudos'
  if (includesAny(q, ['carro', 'tenis', 'relogio', 'perfume', 'notebook', 'celular', 'comprar', 'preco'])) return 'Compras'
  if (includesAny(q, ['viagem', 'viajar', 'hotel', 'passagem', 'roteiro'])) return 'Viagens'
  if (includesAny(q, ['dinheiro', 'guardar', 'investir', 'conta', 'cartao', 'parcela', 'orcamento'])) return 'Dinheiro'
  if (includesAny(q, ['casa', 'apartamento', 'aluguel', 'movel'])) return 'Casa'
  if (includesAny(q, ['livro', 'serie', 'filme', 'restaurante', 'show', 'lazer'])) return 'Lazer'
  return 'Pessoal'
}

function reminderDate(input: string) {
  const q = commandAscii(input)
  const now = new Date()
  const atNine = (date: Date) => {
    date.setHours(9, 0, 0, 0)
    return date
  }

  const explicit = q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (explicit) {
    const day = Number(explicit[1])
    const month = Number(explicit[2]) - 1
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear()
    if (year < 100) year += 2000
    let date = atNine(new Date(year, month, day))
    if (!explicit[3] && date.getTime() <= now.getTime()) date = atNine(new Date(year + 1, month, day))
    return date
  }

  if (q.includes('amanha')) {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    return atNine(date)
  }

  const inDays = q.match(/\bem\s+(\d{1,2})\s+dias?\b/)
  if (inDays) {
    const date = new Date(now)
    date.setDate(date.getDate() + Number(inDays[1]))
    return atNine(date)
  }

  if (q.includes('semana que vem')) {
    const date = new Date(now)
    date.setDate(date.getDate() + 7)
    return atNine(date)
  }

  const weekdays: Array<[string, number]> = [
    ['domingo', 0], ['segunda', 1], ['terca', 2], ['quarta', 3], ['quinta', 4], ['sexta', 5], ['sabado', 6],
  ]
  const weekday = weekdays.find(([name]) => q.includes(name))
  if (weekday) {
    const date = new Date(now)
    let delta = (weekday[1] - date.getDay() + 7) % 7
    if (delta === 0) delta = 7
    date.setDate(date.getDate() + delta)
    return atNine(date)
  }

  const date = new Date(now)
  date.setDate(date.getDate() + 1)
  return atNine(date)
}

function reminderText(input: string) {
  return input
    .replace(/^\s*(me\s+lembra|me\s+lembre|lembrar)\s+(de\s+)?/i, '')
    .replace(/\b(amanhã|amanha|semana que vem|domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado)\b/ig, '')
    .replace(/\bem\s+\d{1,2}\s+dias?\b/ig, '')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function parseLifeCommand(input: string): CommandIntent {
  const value = input.trim()
  const normalized = lower(value)
  const ascii = commandAscii(value)

  if (includesAny(normalized, ['gastei ', 'paguei ', 'recebi ', 'salário ', 'salario ', 'r$ ', 'reais'])) {
    return { kind: 'money', query: value }
  }

  if (/^\s*(me\s+lembra|me\s+lembre|lembrar)\b/i.test(value)) {
    const at = reminderDate(value)
    const query = reminderText(value) || value
    const diffDays = Math.max(1, Math.ceil((at.getTime() - Date.now()) / DAY))
    return { kind: 'reminder', query, area: commandArea(query), followUpAt: at.toISOString(), followUpDays: diffDays }
  }

  const complete = ascii.match(/^\s*(concluir|conclui|conclua|fechar|fecha|finalizar|finaliza)\s+(.+)/)
  if (complete) return { kind: 'complete', query: value.slice(value.toLowerCase().indexOf(complete[2])) }

  const pause = ascii.match(/^\s*(pausar|pausa|pause)\s+(.+)/)
  if (pause) return { kind: 'pause', query: value.slice(value.toLowerCase().indexOf(pause[2])) }

  if (includesAny(normalized, ['buscar ', 'procura ', 'onde está ', 'onde esta ', 'ache ', 'encontre '])) {
    return { kind: 'search', query: value.replace(/^(buscar|procura|onde está|onde esta|ache|encontre)\s+/i, '') }
  }

  const decision = includesAny(normalized, ['decidi ', 'decisão ', 'decisao '])
  const project = includesAny(normalized, ['projeto ', 'comecei ', 'estou criando ', 'estou fazendo '])
  const goal = includesAny(normalized, ['quero ', 'meta ', 'objetivo '])
  const application = includesAny(normalized, ['me candidatei ', 'candidatura ', 'apliquei para '])

  return {
    kind: 'capture',
    query: value,
    type: decision ? 'Decisão' : application ? 'Candidatura' : project ? 'Projeto' : goal ? 'Objetivo' : 'Memória',
    area: application ? 'Carreira' : commandArea(value),
  }
}
