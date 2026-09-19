export type BridgeAppId = 'folego' | 'traco' | 'repertorio'

export type BridgeMetricValue = string | number | boolean | null

export type AppBridge = {
  version: number
  app: BridgeAppId
  title: string
  updatedAt: string
  status?: string
  summary?: string
  metrics: Record<string, BridgeMetricValue>
}

export type BridgeHistoryPoint = {
  date: string
  updatedAt: string
  metrics: Record<string, BridgeMetricValue>
  summary?: string
  status?: string
}

export type BridgeCard = {
  id: BridgeAppId
  title: string
  description: string
  href: string
  bridge: AppBridge | null
}

const APP_CONFIG: Record<BridgeAppId, Omit<BridgeCard, 'bridge'>> = {
  folego: {
    id: 'folego',
    title: 'Fôlego',
    description: 'Dinheiro, ritmo do mês e margem de decisão.',
    href: 'https://caueccipriano.github.io/folego-app/',
  },
  traco: {
    id: 'traco',
    title: 'Traço',
    description: 'Consistência, treinos e evolução de performance.',
    href: 'https://caueccipriano.github.io/v60-workout-app/',
  },
  repertorio: {
    id: 'repertorio',
    title: 'Repertório',
    description: 'Aprendizado, leituras e conhecimento consolidado.',
    href: 'https://caueccipriano.github.io/repertorio-app/',
  },
}

const BRIDGE_KEYS: Record<BridgeAppId, string[]> = {
  folego: ['eu_bridge_folego_v1'],
  traco: ['eu_bridge_traco_v2', 'eu_bridge_traco_v1'],
  repertorio: ['eu_bridge_repertorio_v1'],
}

const HISTORY_KEY = 'eu_bridge_history_v1'

function parseBridgeValue(raw: string | null): AppBridge | null {
  if (!raw) return null

  try {
    let value: unknown = JSON.parse(raw)

    if (typeof value === 'string') {
      value = JSON.parse(value)
    }

    if (!value || typeof value !== 'object') return null

    const bridge = value as Partial<AppBridge>
    if (!bridge.app || !bridge.title || !bridge.updatedAt || !bridge.metrics) return null

    return bridge as AppBridge
  } catch {
    return null
  }
}

function generatedSummary(bridge: AppBridge) {
  const metrics = bridge.metrics || {}

  if (bridge.app === 'folego') {
    const used = typeof metrics.budgetUsedPercent === 'number' ? metrics.budgetUsedPercent + '% do orçamento usado' : null
    const days = typeof metrics.daysUntilIncome === 'number' ? metrics.daysUntilIncome + ' dias até o próximo recebimento' : null
    const daily = typeof metrics.dailyFolego === 'number'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(metrics.dailyFolego) + ' por dia'
      : null
    return [daily, used, days].filter(Boolean).join(' · ') || 'Resumo financeiro atualizado.'
  }

  if (bridge.app === 'traco') {
    const week = typeof metrics.workoutsThisWeek === 'number' ? metrics.workoutsThisWeek : 0
    const goal = typeof metrics.weeklyGoal === 'number' ? metrics.weeklyGoal : null
    const total = typeof metrics.totalWorkouts === 'number' ? metrics.totalWorkouts : null
    const phase = typeof metrics.shapePhase === 'string' ? 'fase ' + metrics.shapePhase : null
    const next = typeof metrics.nextWorkout === 'string'
      ? 'próximo ' + metrics.nextWorkout
      : typeof metrics.todayRecommendation === 'string'
        ? metrics.todayRecommendation
        : null
    return [
      phase,
      goal ? week + '/' + goal + ' treinos na semana' : week + ' treinos na semana',
      total !== null ? total + ' no histórico' : null,
      next,
    ].filter(Boolean).join(' · ')
  }

  const completed = typeof metrics.completed === 'number' ? metrics.completed : 0
  const studied = typeof metrics.studiedDaysThisWeek === 'number' ? metrics.studiedDaysThisWeek : 0
  const goal = typeof metrics.weeklyGoal === 'number' ? metrics.weeklyGoal : null
  return completed + ' concluídos · ' + (goal ? studied + '/' + goal : studied) + ' dias estudados na semana'
}

function normalizeBridge(bridge: AppBridge | null) {
  if (!bridge) return null
  return {
    ...bridge,
    summary: bridge.summary?.trim() || generatedSummary(bridge),
    status: bridge.status?.trim() || 'atualizado',
  }
}

function findBridge(id: BridgeAppId) {
  for (const suffix of BRIDGE_KEYS[id]) {
    const direct = normalizeBridge(parseBridgeValue(localStorage.getItem(suffix)))
    if (direct) return direct

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key || !key.endsWith(suffix)) continue

      const bridge = normalizeBridge(parseBridgeValue(localStorage.getItem(key)))
      if (bridge) return bridge
    }
  }

  return null
}

function dayKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function readHistoryMap(): Record<BridgeAppId, BridgeHistoryPoint[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}') as Partial<Record<BridgeAppId, BridgeHistoryPoint[]>>
    return {
      folego: Array.isArray(parsed.folego) ? parsed.folego : [],
      traco: Array.isArray(parsed.traco) ? parsed.traco : [],
      repertorio: Array.isArray(parsed.repertorio) ? parsed.repertorio : [],
    }
  } catch {
    return { folego: [], traco: [], repertorio: [] }
  }
}

function saveHistoryMap(history: Record<BridgeAppId, BridgeHistoryPoint[]>) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function captureBridgeHistory(bridges: AppBridge[]) {
  const history = readHistoryMap()

  bridges.forEach((bridge) => {
    const id = bridge.app
    const date = dayKey(bridge.updatedAt)
    const point: BridgeHistoryPoint = {
      date,
      updatedAt: bridge.updatedAt,
      metrics: bridge.metrics,
      summary: bridge.summary,
      status: bridge.status,
    }

    const existingIndex = history[id].findIndex((item) => item.date === date)
    if (existingIndex >= 0) {
      history[id][existingIndex] = point
    } else {
      history[id].push(point)
    }

    history[id] = history[id]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90)
  })

  saveHistoryMap(history)
}

export function readBridgeHistory(id: BridgeAppId) {
  return readHistoryMap()[id]
}

export function readAppBridges(): BridgeCard[] {
  const cards = (Object.keys(APP_CONFIG) as BridgeAppId[]).map((id) => ({
    ...APP_CONFIG[id],
    bridge: findBridge(id),
  }))

  captureBridgeHistory(cards.flatMap((card) => card.bridge ? [card.bridge] : []))
  return cards
}

export function latestBridgeDelta(id: BridgeAppId, metric: string) {
  const history = readBridgeHistory(id)
  if (history.length < 2) return null

  const current = history[history.length - 1]?.metrics[metric]
  const previous = history[history.length - 2]?.metrics[metric]

  if (typeof current !== 'number' || typeof previous !== 'number') return null
  return current - previous
}


export async function forceRefreshAppBridges(timeoutMs = 9000): Promise<BridgeCard[]> {
  if (typeof document === 'undefined') return readAppBridges()

  const frames = (Object.keys(APP_CONFIG) as BridgeAppId[]).map((id) => {
    const frame = document.createElement('iframe')
    const separator = APP_CONFIG[id].href.includes('?') ? '&' : '?'
    frame.src = APP_CONFIG[id].href + separator + 'eu_bridge_refresh=' + Date.now()
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.position = 'fixed'
    frame.style.width = '1px'
    frame.style.height = '1px'
    frame.style.opacity = '0'
    frame.style.pointerEvents = 'none'
    frame.style.left = '-9999px'
    frame.style.bottom = '0'
    document.body.appendChild(frame)
    return frame
  })

  const started = Date.now()

  return await new Promise((resolve) => {
    const finish = () => {
      frames.forEach((frame) => frame.remove())
      resolve(readAppBridges())
    }

    const poll = window.setInterval(() => {
      const cards = readAppBridges()
      const allReady = cards.every((card) => Boolean(card.bridge?.summary))
      if (allReady) {
        window.clearInterval(poll)
        window.clearTimeout(timeout)
        finish()
      }
    }, 700)

    const timeout = window.setTimeout(() => {
      window.clearInterval(poll)
      finish()
    }, Math.max(2500, timeoutMs))

    if (Date.now() - started > timeoutMs) {
      window.clearInterval(poll)
      window.clearTimeout(timeout)
      finish()
    }
  })
}
