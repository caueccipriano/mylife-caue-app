import type { BridgeCard } from './integrations'
import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { derivePeople, deriveLivingGoals } from './adaptiveLife'
import { deriveDecisionJournal, deriveWhatChanged, searchLife } from './lifeCommandCenter'
import { deriveProjectHandoff, deriveWaiting } from './lifeOSIntelligence'
import { brainConfidenceForSourceCount, brainDecisionQueryIsGeneric, brainIntentFor, brainPeopleQueryIsGeneric, type BrainIntent } from './euBrainRules'
import { deriveOneEuConnections } from './oneEu'

export type BrainAction = {
  label: string
  route: string
  icon: 'arrow-up-right' | 'collections' | 'user' | 'compass' | 'wallet' | 'search'
}

export type BrainAnswer = {
  intent: BrainIntent
  eyebrow: string
  answer: string
  detail?: string
  confidence: 'high' | 'medium' | 'low'
  sources: StoredRecord[]
  actions: BrainAction[]
  trace: string[]
}

function lower(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function compact(value: string, max = 150) {
  const clean = value.trim()
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}

function visible(records: StoredRecord[]) {
  return records.filter(isRecordVisibleForInsights)
}

function routeForRecord(record: StoredRecord) {
  return '/registro/' + record.id
}

function answerStatus(records: StoredRecord[], bridges: BridgeCard[]): BrainAnswer {
  const usable = visible(records)
  const waiting = deriveWaiting(usable)
  const goals = deriveLivingGoals(usable)
  const activeGoals = goals.filter((goal) => goal.state === 'attention' || goal.state === 'quiet')
  const active = usable.filter((record) => record.status === 'active' && !deriveWaiting([record]).length)
  const bridgeBits = bridges.filter((card) => card.bridge?.summary).slice(0, 2)
  const connections = deriveOneEuConnections(usable, bridges)
  const topConnection = connections[0]

  const sources = [
    ...active.slice(0, 2),
    ...waiting.slice(0, 2),
    ...activeGoals.map((goal) => goal.record).slice(0, 2),
  ].filter((record, index, arr) => arr.findIndex((item) => item.id === record.id) === index).slice(0, 6)

  const parts: string[] = []
  if (activeGoals.length) parts.push(activeGoals.length + (activeGoals.length === 1 ? ' objetivo merece um movimento' : ' objetivos merecem um movimento'))
  if (waiting.length) parts.push(waiting.length + (waiting.length === 1 ? ' coisa está nas mãos de outra pessoa' : ' coisas estão nas mãos de outras pessoas'))
  if (!parts.length && active.length) parts.push(active.length + (active.length === 1 ? ' frente segue viva' : ' frentes seguem vivas'))

  return {
    intent: 'status',
    eyebrow: 'EU, AGORA',
    answer: parts.length ? parts.slice(0, 2).join(' · ') + '.' : 'Nada importante está exigindo sua atenção agora.',
    detail: topConnection
      ? topConnection.title + ' ' + topConnection.detail
      : bridgeBits.length
        ? bridgeBits.map((card) => card.title + ': ' + card.bridge?.summary).join(' · ')
        : 'A leitura usa apenas o que já existe no seu arquivo neste aparelho.',
    confidence: brainConfidenceForSourceCount(sources.length),
    sources,
    actions: [
      { label: 'Abrir Central', route: '/sistema', icon: 'collections' },
      ...(topConnection ? [{ label: topConnection.actionLabel, route: topConnection.route, icon: 'compass' as const }] : [{ label: 'Ver objetivos', route: '/sistema?view=goals', icon: 'compass' as const }]),
    ],
    trace: ['registros ativos', 'aguardando', 'objetivos vivos', connections.length ? 'conexões entre módulos' : bridgeBits.length ? 'sinais integrados' : 'sem sinais externos'],
  }
}

function answerChanged(records: StoredRecord[]): BrainAnswer {
  const changes = deriveWhatChanged(records, 7)
  const sources = changes.map((item) => item.record).slice(0, 6)

  if (!changes.length) {
    return {
      intent: 'changed',
      eyebrow: 'WHAT CHANGED?',
      answer: 'Nada relevante mudou no seu arquivo nos últimos 7 dias.',
      detail: 'Silêncio também é informação; o EU não cria novidade artificial.',
      confidence: 'high',
      sources: [],
      actions: [{ label: 'Abrir Memórias', route: '/memorias', icon: 'collections' }],
      trace: ['janela de 7 dias', 'criações', 'atualizações', 'conclusões'],
    }
  }

  const completed = changes.filter((item) => item.kind === 'completed').length
  const decisions = changes.filter((item) => item.kind === 'decision').length
  const newest = changes[0]

  return {
    intent: 'changed',
    eyebrow: 'WHAT CHANGED?',
    answer: changes.length + (changes.length === 1 ? ' mudança relevante apareceu' : ' mudanças relevantes apareceram') + ' nos últimos 7 dias.',
    detail: (completed ? completed + ' concluída' + (completed > 1 ? 's' : '') + ' · ' : '') + (decisions ? decisions + (decisions > 1 ? ' decisões · ' : ' decisão · ') : '') + 'mais recente: “' + compact(newest.record.text, 120) + '”',
    confidence: 'high',
    sources,
    actions: [{ label: 'Ver histórico', route: '/memorias', icon: 'collections' }],
    trace: ['últimos 7 dias', 'novos registros', 'mudanças de estado', 'decisões'],
  }
}

function answerHandoff(records: StoredRecord[], question: string): BrainAnswer {
  const matches = searchLife(records, question)
  const project = matches.find((record) => /projeto/i.test(record.type)) || matches[0]

  if (!project) {
    return {
      intent: 'handoff',
      eyebrow: 'ONDE PARAMOS?',
      answer: 'Não encontrei contexto suficiente para saber onde você parou.',
      detail: 'Tente citar o nome do projeto ou assunto.',
      confidence: 'low',
      sources: [],
      actions: [{ label: 'Abrir projetos', route: '/sistema?view=projects', icon: 'collections' }],
      trace: ['busca local', 'handoff de projeto'],
    }
  }

  const handoff = deriveProjectHandoff(project, visible(records))
  const sources = [project, ...handoff.decisions, ...handoff.open, ...handoff.waiting]
    .filter((record, index, arr) => arr.findIndex((item) => item.id === record.id) === index)
    .slice(0, 6)

  return {
    intent: 'handoff',
    eyebrow: 'ONDE PARAMOS?',
    answer: handoff.nextMove
      ? 'O próximo passo mais claro é: “' + compact(handoff.nextMove, 150) + '”'
      : 'O último movimento que encontrei foi: “' + compact(handoff.lastMovement, 150) + '”',
    detail: handoff.relatedCount
      ? handoff.relatedCount + ' conexões · ' + handoff.decisions.length + ' decisões · ' + handoff.waiting.length + ' aguardando.'
      : 'Não há registros explicitamente conectados a esse item.',
    confidence: handoff.relatedCount ? 'high' : 'medium',
    sources,
    actions: [
      { label: 'Abrir contexto', route: routeForRecord(project), icon: 'arrow-up-right' },
      { label: 'Projetos', route: '/sistema?view=projects', icon: 'collections' },
    ],
    trace: ['busca pelo assunto', 'último movimento', 'próximo passo', 'relações explícitas'],
  }
}

function answerDecision(records: StoredRecord[], question: string): BrainAnswer {
  const matches = searchLife(records, question)
  const journal = deriveDecisionJournal(matches.length ? matches : brainDecisionQueryIsGeneric(question) ? records : [])
  const sources = journal.map((entry) => entry.record).slice(0, 6)

  if (!journal.length) {
    return {
      intent: 'decision',
      eyebrow: 'DECISÕES',
      answer: 'Não encontrei uma decisão registrada que responda bem a isso.',
      detail: 'Posso encontrar contexto relacionado, mas não vou chamar de decisão algo que não foi registrado como tal.',
      confidence: 'low',
      sources: matches.slice(0, 4),
      actions: [{ label: 'Decida comigo', route: '/decidir', icon: 'compass' }],
      trace: ['busca local', 'tipo Decisão', 'expectativa e resultado'],
    }
  }

  const latest = journal[0]
  return {
    intent: 'decision',
    eyebrow: 'DECISÕES',
    answer: journal.length === 1
      ? 'Encontrei esta decisão: “' + compact(latest.record.text, 170) + '”'
      : 'Encontrei ' + journal.length + ' decisões relacionadas. A mais recente é: “' + compact(latest.record.text, 160) + '”',
    detail: latest.record.outcome && latest.record.outcome !== 'unknown'
      ? 'Resultado registrado: ' + latest.note + '.'
      : latest.record.expectation
        ? 'Você esperava: “' + compact(latest.record.expectation, 120) + '”.'
        : latest.note,
    confidence: brainConfidenceForSourceCount(sources.length),
    sources,
    actions: [
      { label: 'Comparar opções', route: '/decidir', icon: 'compass' },
      { label: 'Abrir decisão', route: routeForRecord(latest.record), icon: 'arrow-up-right' },
    ],
    trace: ['decisões relacionadas', 'resultado', 'expectativa', 'mais recente primeiro'],
  }
}

function answerWaiting(records: StoredRecord[]): BrainAnswer {
  const waiting = deriveWaiting(records)
  const people = derivePeople(records).filter((person) => person.waitingCount > 0)
  const sources = waiting.slice(0, 6)

  return {
    intent: 'waiting',
    eyebrow: 'AGUARDANDO',
    answer: waiting.length
      ? waiting.length + (waiting.length === 1 ? ' coisa está fora das suas mãos agora.' : ' coisas estão fora das suas mãos agora.')
      : 'Não encontrei nada claramente aguardando outra pessoa agora.',
    detail: people.length
      ? 'Pessoas com contexto de espera: ' + people.slice(0, 3).map((person) => person.name).join(', ') + '.'
      : waiting.length
        ? 'Há espera registrada, mas sem uma pessoa identificada com segurança.'
        : 'O EU não vai criar follow-up sem evidência.',
    confidence: waiting.length ? 'high' : 'medium',
    sources,
    actions: [
      { label: 'Abrir Pessoas', route: '/pessoas', icon: 'user' },
      { label: 'Abrir Central', route: '/sistema', icon: 'collections' },
    ],
    trace: ['linguagem de espera', 'follow-ups', 'pessoas detectadas'],
  }
}

function answerPeople(records: StoredRecord[], question: string): BrainAnswer {
  const q = lower(question)
  const people = derivePeople(records)
  const named = people.find((person) => q.includes(lower(person.name)))
  const person = named || (brainPeopleQueryIsGeneric(question) ? people[0] : undefined)

  if (!person) {
    return {
      intent: 'people',
      eyebrow: 'PESSOAS',
      answer: 'Ainda não há uma pessoa identificada com segurança para responder isso.',
      detail: 'O EU exige contexto explícito antes de montar uma história sobre alguém.',
      confidence: 'low',
      sources: [],
      actions: [{ label: 'Abrir Pessoas', route: '/pessoas', icon: 'user' }],
      trace: ['nomes em contexto', 'promessas', 'retornos'],
    }
  }

  return {
    intent: 'people',
    eyebrow: 'PESSOAS',
    answer: person.name + ' aparece em ' + person.records.length + (person.records.length === 1 ? ' registro.' : ' registros.'),
    detail: person.headline + (person.commitmentCount ? ' · ' + person.commitmentCount + ' promessas/retornos detectados.' : '.'),
    confidence: person.records.length >= 2 ? 'high' : 'medium',
    sources: person.records.slice(0, 6),
    actions: [{ label: 'Abrir Pessoas', route: '/pessoas', icon: 'user' }],
    trace: ['nome explícito', 'timeline', 'esperas', 'compromissos'],
  }
}

function answerImpact(records: StoredRecord[], question: string, bridges: BridgeCard[]): BrainAnswer {
  const matches = searchLife(records, question)
  const words = new Set(lower(question).split(/\s+/).filter((word) => word.length >= 4))
  const related = visible(records)
    .map((record) => {
      const haystack = lower([record.text, record.type, record.area, record.whyItMatters, record.nextMove, ...(record.tags || [])].filter(Boolean).join(' '))
      const score = [...words].filter((word) => haystack.includes(word)).length
      return { record, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.record)

  const sources = [...matches, ...related].filter((record, index, arr) => arr.findIndex((item) => item.id === record.id) === index).slice(0, 7)
  const areas = [...new Set(sources.map((record) => record.area))].slice(0, 4)
  const money = bridges.find((card) => card.id === 'folego')?.bridge?.summary
  const oneEuConnections = deriveOneEuConnections(records, bridges)
  const linkedConnection = oneEuConnections.find((connection) => connection.areas.some((area) => areas.includes(area))) || oneEuConnections[0]

  return {
    intent: 'impact',
    eyebrow: 'IMPACTO',
    answer: sources.length
      ? 'Isso toca ' + (areas.length ? areas.join(', ') : 'mais de uma parte do seu arquivo') + '.'
      : 'Ainda não há contexto suficiente no seu EU para estimar esse impacto.',
    detail: money && /compr|gasto|dinheiro|carro|assinar|pagar|salario|salário/i.test(question)
      ? 'Sinal financeiro atual: ' + money
      : linkedConnection
        ? linkedConnection.title + ' ' + linkedConnection.detail
        : sources.length
          ? 'Veja as evidências abaixo antes de tratar isso como consequência real.'
          : 'O EU não transforma hipótese em fato.',
    confidence: brainConfidenceForSourceCount(sources.length),
    sources,
    actions: [
      { label: 'Decida comigo', route: '/decidir', icon: 'compass' },
      ...(money ? [{ label: 'Abrir Dinheiro', route: '/dinheiro', icon: 'wallet' as const }] : linkedConnection ? [{ label: linkedConnection.actionLabel, route: linkedConnection.route, icon: 'compass' as const }] : []),
    ],
    trace: ['termos da hipótese', 'áreas relacionadas', money ? 'sinal financeiro' : 'sem sinal financeiro'],
  }
}

function answerSearch(records: StoredRecord[], question: string, bridges: BridgeCard[]): BrainAnswer {
  const matches = searchLife(records, question)
  const words = lower(question).split(/\s+/).filter((word) => word.length >= 4)
  const connection = deriveOneEuConnections(records, bridges).find((item) => {
    const haystack = lower(item.title + ' ' + item.detail + ' ' + item.areas.join(' '))
    return words.some((word) => haystack.includes(word))
  })
  if (!matches.length) {
    if (connection) {
      return {
        intent: 'search',
        eyebrow: 'ONE EU',
        answer: connection.title,
        detail: connection.detail,
        confidence: 'medium',
        sources: [],
        actions: [{ label: connection.actionLabel, route: connection.route, icon: 'compass' }],
        trace: ['busca local sem registro direto', 'conexões entre módulos', ...connection.sourceBridgeIds.map((id) => 'bridge ' + id)],
      }
    }
    return {
      intent: 'search',
      eyebrow: 'LIFE SEARCH',
      answer: 'Ainda não encontrei algo no seu arquivo que responda bem a isso.',
      detail: 'Isso pode significar que o assunto nunca foi registrado — ou que a pergunta precisa de um termo mais específico.',
      confidence: 'low',
      sources: [],
      actions: [{ label: 'Buscar outro termo', route: '/pergunte', icon: 'search' }],
      trace: ['busca local', 'texto', 'área', 'tags', 'próximo passo'],
    }
  }

  return {
    intent: 'search',
    eyebrow: 'LIFE SEARCH',
    answer: matches.length === 1
      ? 'Encontrei isto: “' + compact(matches[0].text, 180) + '”'
      : 'Encontrei ' + matches.length + ' registros relacionados. O mais relevante é: “' + compact(matches[0].text, 160) + '”',
    detail: 'A resposta foi montada só com informações já existentes no seu EU.',
    confidence: brainConfidenceForSourceCount(matches.length),
    sources: matches.slice(0, 6),
    actions: [{ label: 'Abrir principal', route: routeForRecord(matches[0]), icon: 'arrow-up-right' }],
    trace: ['busca local', 'relevância', 'fontes verificáveis'],
  }
}

export function askEuBrain(records: StoredRecord[], bridges: BridgeCard[], question: string): BrainAnswer {
  const intent = brainIntentFor(question)
  if (intent === 'status') return answerStatus(records, bridges)
  if (intent === 'changed') return answerChanged(records)
  if (intent === 'handoff') return answerHandoff(records, question)
  if (intent === 'decision') return answerDecision(records, question)
  if (intent === 'waiting') return answerWaiting(records)
  if (intent === 'people') return answerPeople(records, question)
  if (intent === 'impact') return answerImpact(records, question, bridges)
  return answerSearch(records, question, bridges)
}
