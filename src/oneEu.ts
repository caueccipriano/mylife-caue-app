import type { BridgeCard } from './integrations'
import type { StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { deriveEcosystemInsights } from './ecosystem'
import { deriveCrossSignals } from './lifeOSIntelligence'
import type { EuIconName } from './v2Ui'

export type OneEuTone = 'green' | 'amber' | 'coral' | 'lilac' | 'pink' | 'cobalt'

export type OneEuConnection = {
  id: string
  eyebrow: string
  title: string
  detail: string
  route: string
  actionLabel: string
  tone: OneEuTone
  icon: EuIconName
  areas: string[]
  sourceRecordIds: string[]
  sourceBridgeIds: string[]
  priority: number
}

function lower(value?: string | null) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function routeForEcosystem(id: string) {
  if (id === 'money-purchases') return '/dinheiro'
  if (id === 'learning-career' || id === 'learning-loop') return '/vida/carreira'
  if (id === 'training-rhythm') return '/vida'
  return '/vida'
}

function areasForEcosystem(id: string) {
  if (id === 'money-purchases') return ['Compras', 'Dinheiro']
  if (id === 'learning-career' || id === 'learning-loop') return ['Carreira', 'Estudos']
  if (id === 'training-rhythm') return ['Pessoal']
  return []
}

function iconForEcosystem(id: string): EuIconName {
  if (id === 'money-purchases') return 'wallet'
  if (id === 'learning-career' || id === 'learning-loop') return 'briefcase'
  if (id === 'training-rhythm') return 'bolt'
  return 'sparkles'
}

function toneForEcosystem(tone: 'coral' | 'green' | 'amber' | 'pink'): OneEuTone {
  return tone
}

function recordTimestamp(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

export function deriveOneEuConnections(records: StoredRecord[], bridges: BridgeCard[]): OneEuConnection[] {
  const visible = records.filter(isRecordVisibleForInsights)
  const connections: OneEuConnection[] = []

  deriveEcosystemInsights(visible, bridges).forEach((insight, index) => {
    connections.push({
      id: 'ecosystem:' + insight.id,
      eyebrow: 'CONEXÃO VIVA',
      title: insight.title,
      detail: insight.detail,
      route: routeForEcosystem(insight.id),
      actionLabel: insight.id === 'money-purchases' ? 'ver no Dinheiro' : 'abrir contexto',
      tone: toneForEcosystem(insight.tone),
      icon: iconForEcosystem(insight.id),
      areas: areasForEcosystem(insight.id),
      sourceRecordIds: [],
      sourceBridgeIds: insight.id === 'money-purchases'
        ? ['folego']
        : insight.id === 'learning-career' || insight.id === 'learning-loop'
          ? ['repertorio']
          : insight.id === 'training-rhythm'
            ? ['traco']
            : [],
      priority: 80 - index,
    })
  })

  const folego = bridges.find((card) => card.id === 'folego')
  const goalCount = folego?.bridge?.metrics.activeGoalCount
  const goalName = folego?.bridge?.metrics.topGoalName
  const goalProgress = folego?.bridge?.metrics.topGoalProgress
  if (typeof goalCount === 'number' && goalCount > 0 && typeof goalName === 'string' && goalName.trim()) {
    connections.push({
      id: 'folego:goal',
      eyebrow: 'META FINANCEIRA + VIDA',
      title: 'Meta financeira: ' + goalName,
      detail: (typeof goalProgress === 'number' ? goalProgress + '% construído no Fôlego. ' : '') + 'O EU usa esse progresso como contexto sem duplicar seus dados.',
      route: '/dinheiro',
      actionLabel: 'abrir meta',
      tone: 'green',
      icon: 'wallet',
      areas: ['Dinheiro'],
      sourceRecordIds: [],
      sourceBridgeIds: ['folego'],
      priority: 92,
    })
  }

  deriveCrossSignals(visible).forEach((signal, index) => {
    const signalRecords = signal.recordIds
      .map((id) => visible.find((record) => record.id === id))
      .filter(Boolean) as StoredRecord[]
    const areas = [...new Set(signalRecords.map((record) => record.area))]
    const lead = signalRecords[0]
    connections.push({
      id: 'cross:' + signal.id,
      eyebrow: 'ARQUIVO + CENTRAL',
      title: signal.title,
      detail: signal.detail,
      route: lead ? '/registro/' + lead.id : '/sistema',
      actionLabel: 'ver conexão',
      tone: 'lilac',
      icon: 'collections',
      areas,
      sourceRecordIds: signal.recordIds,
      sourceBridgeIds: [],
      priority: 72 - index,
    })
  })

  const recentCutoff = Date.now() - 14 * 86400000
  const recentDecisions = visible
    .filter((record) => lower(record.type).includes('decis') && recordTimestamp(record) >= recentCutoff)
    .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))

  recentDecisions.slice(0, 5).forEach((decision, index) => {
    const movement = visible
      .filter((record) => record.id !== decision.id)
      .filter((record) => record.area === decision.area && record.status === 'active')
      .filter((record) => recordTimestamp(record) >= recordTimestamp(decision))
      .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0]
    if (!movement) return

    connections.push({
      id: 'decision-motion:' + decision.id,
      eyebrow: 'MEMÓRIA + MOVIMENTO',
      title: 'Uma decisão virou movimento em ' + decision.area + '.',
      detail: '“' + decision.text + '” ganhou continuidade em “' + movement.text + '”.',
      route: '/registro/' + movement.id,
      actionLabel: 'ver continuidade',
      tone: 'cobalt',
      icon: 'check',
      areas: [decision.area],
      sourceRecordIds: [decision.id, movement.id],
      sourceBridgeIds: [],
      priority: 68 - index,
    })
  })

  const seen = new Set<string>()
  return connections
    .filter((item) => {
      const semantic = lower(item.title + '|' + item.route)
      if (seen.has(semantic)) return false
      seen.add(semantic)
      return true
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8)
}
