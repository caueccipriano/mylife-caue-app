import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { deriveWaiting, isWaitingRecord } from './lifeOSIntelligence'

const DAY = 86400000

function lower(value?: string) {
  return (value || '').toLocaleLowerCase('pt-BR')
}

function words(value: string) {
  const stop = new Set([
    'para','com','sem','uma','uns','umas','por','que','dos','das','de','do','da','em','no','na','nos','nas',
    'meu','minha','meus','minhas','eu','quero','preciso','vou','ser','ter','mais','menos','agora','depois',
    'isso','essa','esse','aquela','aquele','como','quando','onde','porque','pra','pro','pela','pelo','sobre',
  ])
  return [...new Set(lower(value).replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter((word) => word.length >= 3 && !stop.has(word)))]
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

function progressValue(record: StoredRecord) {
  if (record.status === 'completed' || record.progressLevel === 'done') return 100
  if (record.progressLevel === 'almost') return 82
  if (record.progressLevel === 'half') return 52
  if (record.progressLevel === 'quarter') return 28
  if (record.progressLevel === 'started') return 12
  return null
}

export type LivingGoal = {
  record: StoredRecord
  progress: number | null
  state: 'moving' | 'quiet' | 'attention' | 'waiting'
  stateLabel: string
  relatedCount: number
  recentMovementCount: number
  nextMove: string
  evidence: StoredRecord[]
}

export function deriveLivingGoals(records: StoredRecord[]): LivingGoal[] {
  const usable = visible(records)
  const goals = usable
    .filter((record) => active(record) && /objetivo|meta/i.test(record.type))
    .sort((a, b) => stamp(b) - stamp(a))

  return goals.map((goal) => {
    const goalWords = words(goal.text + ' ' + (goal.whyItMatters || '') + ' ' + (goal.tags || []).join(' '))
    const related = usable
      .filter((record) => record.id !== goal.id)
      .map((record) => {
        const haystack = words([record.text, record.type, record.area, record.whyItMatters, ...(record.tags || [])].filter(Boolean).join(' '))
        const overlap = goalWords.filter((word) => haystack.includes(word)).length
        const explicit = goal.relatedIds?.includes(record.id) || record.relatedIds?.includes(goal.id)
        const sameArea = goal.area === record.area
        return { record, score: explicit ? 100 : overlap * 4 + (sameArea ? 1 : 0) }
      })
      .filter((item) => item.score >= 4)
      .sort((a, b) => b.score - a.score || stamp(b.record) - stamp(a.record))
      .slice(0, 8)
      .map((item) => item.record)

    const recentCutoff = Date.now() - 14 * DAY
    const recent = related.filter((record) => stamp(record) >= recentCutoff)
    const waiting = related.some(isWaitingRecord) || isWaitingRecord(goal)
    const overdue = Boolean(goal.followUpAt && new Date(goal.followUpAt).getTime() <= Date.now() && !waiting)
    const old = stamp(goal) < Date.now() - 21 * DAY && !recent.length
    const state = waiting ? 'waiting' : overdue ? 'attention' : recent.length ? 'moving' : old ? 'quiet' : 'moving'
    const stateLabel = state === 'waiting'
      ? 'aguardando algo de fora'
      : state === 'attention'
        ? 'pede um movimento'
        : state === 'quiet'
          ? 'ficou quieto'
          : 'em movimento'

    return {
      record: goal,
      progress: progressValue(goal),
      state,
      stateLabel,
      relatedCount: related.length,
      recentMovementCount: recent.length,
      nextMove: goal.nextMove?.trim() || (goal.followUpAt ? 'Retomar no momento marcado' : recent[0]?.nextMove?.trim() || 'Definir o próximo movimento'),
      evidence: related.slice(0, 4),
    }
  })
}

const personCue = /\b(?:falei com|conversei com|resposta de|retorno de|aguardando resposta de|aguardando retorno de|com)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}À-ÿ'-]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}À-ÿ'-]+){0,2})/gu
const badNames = new Set([
  'EU','Hoje','Dinheiro','Carreira','Trabalho','Pessoal','Projeto','Projetos','Objetivo','Meta','Google','ChatGPT',
  'SQL','Power BI','Brasil','Jundiaí','São Paulo','Kindle','Stardew Valley',
])

function namesFromRecord(record: StoredRecord) {
  const result = new Set<string>()
  const typeLooksPerson = /pessoa|contato|relacionamento|relação/i.test(record.type)
  if (typeLooksPerson && record.objectName?.trim()) result.add(record.objectName.trim())

  for (const tag of record.tags || []) {
    const match = tag.match(/^(?:pessoa|person|com):\s*(.+)$/i)
    if (match?.[1]) result.add(match[1].trim())
  }

  const text = record.text + ' ' + (record.nextMove || '')
  for (const match of text.matchAll(personCue)) {
    const name = match[1]?.trim()
    if (name && !badNames.has(name) && name.length >= 3) result.add(name)
  }

  return [...result]
}

export type PersonSummary = {
  name: string
  records: StoredRecord[]
  openCount: number
  waitingCount: number
  commitmentCount: number
  lastAt: string
  headline: string
}

export function derivePeople(records: StoredRecord[]): PersonSummary[] {
  const usable = visible(records)
  const map = new Map<string, StoredRecord[]>()

  usable.forEach((record) => {
    namesFromRecord(record).forEach((name) => {
      const key = lower(name)
      const current = map.get(key) || []
      current.push(record)
      map.set(key, current)
    })
  })

  return [...map.entries()]
    .map(([key, personRecords]) => {
      const ordered = [...personRecords].sort((a, b) => stamp(b) - stamp(a))
      const display = namesFromRecord(ordered[0]).find((name) => lower(name) === key) || key
      const waitingCount = ordered.filter(isWaitingRecord).length
      const openCount = ordered.filter(active).length
      const commitmentCount = ordered.filter((record) => /prometi|ficou de|vai retornar|aguardando|resposta|retorno/i.test(record.text + ' ' + (record.nextMove || ''))).length
      return {
        name: display,
        records: ordered,
        openCount,
        waitingCount,
        commitmentCount,
        lastAt: ordered[0]?.updatedAt || ordered[0]?.createdAt,
        headline: waitingCount
          ? waitingCount + (waitingCount === 1 ? ' coisa aguardando' : ' coisas aguardando')
          : openCount
            ? openCount + (openCount === 1 ? ' contexto vivo' : ' contextos vivos')
            : 'histórico no seu EU',
      }
    })
    .filter((person) => person.records.length > 0)
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
}

export type DecisionEvidence = {
  record: StoredRecord
  score: number
  reason: string
}

export type DecisionComparison = {
  optionA: { label: string; score: number; support: DecisionEvidence[]; conflicts: DecisionEvidence[] }
  optionB: { label: string; score: number; support: DecisionEvidence[]; conflicts: DecisionEvidence[] }
  shared: DecisionEvidence[]
  summary: string
}

function optionEvidence(records: StoredRecord[], option: string, criteria: string) {
  const optionWords = words(option + ' ' + criteria)
  const supportTerms = ['quero','objetivo','meta','prioridade','bom','gostei','oportunidade','crescer','economizar','guardar','melhorar']
  const conflictTerms = ['não','nao','evitar','caro','dívida','divida','risco','atraso','problema','arrependi','regret','pausar','abandonar']

  return visible(records)
    .map((record) => {
      const recordText = [record.text, record.type, record.area, record.whyItMatters, record.nextMove, ...(record.tags || [])].filter(Boolean).join(' ')
      const recordWords = words(recordText)
      const overlap = optionWords.filter((word) => recordWords.includes(word))
      const base = overlap.length * 4
      if (!base) return null

      const normalized = lower(recordText)
      const positive = supportTerms.some((term) => normalized.includes(term))
      const negative = conflictTerms.some((term) => normalized.includes(term)) || record.outcome === 'regret'
      const statusWeight = record.status === 'completed' ? .5 : 1
      const freshnessWeight = stamp(record) >= Date.now() - 90 * DAY ? 1 : .6
      const score = Math.round(base * statusWeight * freshnessWeight * 10) / 10

      return {
        record,
        score,
        polarity: negative ? 'conflict' as const : positive ? 'support' as const : 'neutral' as const,
        reason: overlap.length
          ? 'conecta por ' + overlap.slice(0, 3).join(', ')
          : 'tem relação estrutural no seu arquivo',
      }
    })
    .filter(Boolean) as Array<DecisionEvidence & { polarity: 'support' | 'conflict' | 'neutral' }>
}

export function compareDecisionOptions(records: StoredRecord[], optionA: string, optionB: string, criteria = ''): DecisionComparison {
  const a = optionEvidence(records, optionA, criteria)
  const b = optionEvidence(records, optionB, criteria)
  const aIds = new Set(a.map((item) => item.record.id))
  const bIds = new Set(b.map((item) => item.record.id))

  const shared = a
    .filter((item) => bIds.has(item.record.id))
    .sort((x, y) => y.score - x.score)
    .slice(0, 5)
    .map(({ record, score, reason }) => ({ record, score, reason }))

  const summarize = (items: typeof a) => {
    const support = items.filter((item) => item.polarity !== 'conflict').sort((x, y) => y.score - x.score).slice(0, 5)
    const conflicts = items.filter((item) => item.polarity === 'conflict').sort((x, y) => y.score - x.score).slice(0, 5)
    const score = Math.max(0, Math.round((support.reduce((sum, item) => sum + item.score, 0) - conflicts.reduce((sum, item) => sum + item.score, 0)) * 10) / 10)
    return {
      score,
      support: support.map(({ record, score, reason }) => ({ record, score, reason })),
      conflicts: conflicts.map(({ record, score, reason }) => ({ record, score, reason })),
    }
  }

  const sa = summarize(a.filter((item) => !bIds.has(item.record.id) || item.polarity === 'conflict'))
  const sb = summarize(b.filter((item) => !aIds.has(item.record.id) || item.polarity === 'conflict'))
  const delta = Math.abs(sa.score - sb.score)

  let summary = 'Seu arquivo ainda não diferencia muito essas opções.'
  if (!a.length && !b.length) summary = 'Ainda não encontrei contexto suficiente no seu EU para comparar essas opções.'
  else if (delta >= 6) summary = (sa.score > sb.score ? 'A primeira opção' : 'A segunda opção') + ' encontra mais apoio no contexto que você já registrou.'
  else if (shared.length >= 2) summary = 'As duas opções tocam nos mesmos assuntos; a diferença parece estar mais no trade-off do que na direção.'
  else if (delta > 0) summary = 'Há uma leve diferença de contexto, mas não o bastante para tratar como resposta pronta.'

  return {
    optionA: { label: optionA, ...sa },
    optionB: { label: optionB, ...sb },
    shared,
    summary,
  }
}

export type AdaptiveHomeItem = {
  id: 'action' | 'money' | 'goal' | 'project' | 'people' | 'inbox'
  score: number
  eyebrow: string
  title: string
  detail: string
  route: string
  tone: 'cobalt' | 'green' | 'lilac' | 'amber' | 'pink' | 'coral'
}

export function deriveAdaptiveHome(
  records: StoredRecord[],
  input: { inboxCount: number; reviewCount: number; moneyReady: boolean },
): AdaptiveHomeItem[] {
  const usable = visible(records)
  const waiting = deriveWaiting(usable)
  const activeRecords = usable.filter(active)
  const now = Date.now()
  const overdue = activeRecords.filter((record) => record.followUpAt && new Date(record.followUpAt).getTime() <= now && !isWaitingRecord(record))
  const goals = deriveLivingGoals(usable)
  const projects = activeRecords.filter((record) => /projeto/i.test(record.type))
  const people = derivePeople(usable)
  const staleProjects = projects.filter((record) => stamp(record) < now - 14 * DAY)
  const goalAttention = goals.filter((goal) => goal.state === 'attention' || goal.state === 'quiet')
  const recentMoney = usable.filter((record) => record.area === 'Dinheiro' && stamp(record) >= now - 7 * DAY).length

  const items: AdaptiveHomeItem[] = [
    {
      id: 'action',
      score: overdue.length * 12 + input.reviewCount * 6,
      eyebrow: 'AÇÃO',
      title: overdue.length ? overdue.length + (overdue.length === 1 ? ' coisa pede você agora' : ' coisas pedem você agora') : 'Nada vencido precisa dominar seu dia',
      detail: overdue[0]?.nextMove || overdue[0]?.text || (input.reviewCount ? input.reviewCount + ' revisões aguardam uma escolha simples.' : 'O sistema pode ficar quieto sem inventar tarefa.'),
      route: overdue[0] ? '/registro/' + overdue[0].id : input.reviewCount ? '/revisao' : '/sistema',
      tone: overdue.length ? 'coral' : 'green',
    },
    {
      id: 'goal',
      score: goalAttention.length * 8 + goals.length * 2,
      eyebrow: 'OBJETIVO VIVO',
      title: goalAttention[0]?.record.text || goals[0]?.record.text || 'Seus objetivos ainda não estão cobrando espaço',
      detail: goalAttention[0]?.nextMove || goals[0]?.nextMove || 'Direção sem pressão: quando houver movimento, ele sobe sozinho.',
      route: '/sistema?view=goals',
      tone: 'green',
    },
    {
      id: 'project',
      score: staleProjects.length * 7 + Math.min(projects.length, 4) * 2,
      eyebrow: 'PROJETO',
      title: staleProjects[0]?.text || projects[0]?.text || 'Nenhum projeto precisa ocupar o centro agora',
      detail: staleProjects.length ? 'Há projeto há 2+ semanas sem movimento detectado.' : projects[0]?.nextMove || 'Seus projetos continuam guardados na Central.',
      route: '/sistema?view=projects',
      tone: 'lilac',
    },
    {
      id: 'people',
      score: people.reduce((sum, person) => sum + person.waitingCount * 5 + person.commitmentCount * 3, 0),
      eyebrow: 'PESSOAS',
      title: people[0] ? people[0].name + ' · ' + people[0].headline : 'Nenhuma relação está pedindo acompanhamento',
      detail: people[0] ? 'O EU juntou o contexto dessa pessoa sem criar uma agenda social.' : 'Quando nomes e compromissos aparecerem nos registros, eles se conectam aqui.',
      route: '/pessoas',
      tone: 'pink',
    },
    {
      id: 'inbox',
      score: input.inboxCount * 6,
      eyebrow: 'ENTRADAS',
      title: input.inboxCount ? input.inboxCount + (input.inboxCount === 1 ? ' conversa espera revisão' : ' conversas esperam revisão') : 'Caixa de entrada limpa',
      detail: input.inboxCount ? 'Só entra no seu EU o que você decidir guardar.' : 'Nada novo disputando atenção.',
      route: '/inbox',
      tone: 'cobalt',
    },
    {
      id: 'money',
      score: (input.moneyReady ? 3 : 0) + Math.min(recentMoney, 5),
      eyebrow: 'DINHEIRO',
      title: input.moneyReady ? 'Seu dinheiro está conectado ao EU' : 'Dinheiro fica quieto quando não há sinal',
      detail: input.moneyReady ? 'O módulo financeiro entra em destaque só quando o contexto justificar.' : 'Sem resumo ativo, ele não ocupa espaço principal.',
      route: '/dinheiro',
      tone: 'cobalt',
    },
  ]

  const meaningful = items.filter((item) => item.score > 0).sort((a, b) => b.score - a.score)
  if (meaningful.length) return meaningful.slice(0, 3)
  return items.filter((item) => ['action','goal','money'].includes(item.id)).slice(0, 3)
}
