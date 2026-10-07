type SurfaceStat = {
  seen: number
  engaged: number
  lastSeenAt?: string
  lastEngagedAt?: string
}

type PersonalizationState = {
  version: 1
  routes: Record<string, number>
  surfaces: Record<string, SurfaceStat>
  updatedAt: string
}

const KEY = 'eu-personalization-v1'

function readState(): PersonalizationState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null') as PersonalizationState | null
    if (parsed?.version === 1) return parsed
  } catch {}
  return { version: 1, routes: {}, surfaces: {}, updatedAt: new Date().toISOString() }
}

function writeState(state: PersonalizationState) {
  localStorage.setItem(KEY, JSON.stringify(state))
  window.dispatchEvent(new Event('eu-personalization-updated'))
}

export function trackRouteVisit(path: string) {
  const state = readState()
  state.routes[path] = (state.routes[path] || 0) + 1
  state.updatedAt = new Date().toISOString()
  writeState(state)
}

export function trackSurfaceSeen(id: string) {
  const day = new Date().toISOString().slice(0, 10)
  const sessionKey = 'eu-surface-seen:' + day + ':' + id
  if (sessionStorage.getItem(sessionKey) === '1') return
  sessionStorage.setItem(sessionKey, '1')

  const state = readState()
  const current = state.surfaces[id] || { seen: 0, engaged: 0 }
  state.surfaces[id] = { ...current, seen: current.seen + 1, lastSeenAt: new Date().toISOString() }
  state.updatedAt = new Date().toISOString()
  writeState(state)
}

export function trackSurfaceEngaged(id: string) {
  const state = readState()
  const current = state.surfaces[id] || { seen: 0, engaged: 0 }
  state.surfaces[id] = { ...current, engaged: current.engaged + 1, lastEngagedAt: new Date().toISOString() }
  state.updatedAt = new Date().toISOString()
  writeState(state)
}

export function surfaceAffinity(id: string) {
  const current = readState().surfaces[id]
  if (!current) return 0
  const ignored = Math.max(0, current.seen - current.engaged)
  return Math.min(8, current.engaged * 3) - Math.min(5, ignored)
}

export function preferredPrimaryRoute() {
  const routes = Object.entries(readState().routes)
    .filter(([path]) => ['/', '/dinheiro', '/sistema', '/vida', '/memorias'].includes(path))
    .sort((a, b) => b[1] - a[1])
  return routes[0]?.[0] || '/'
}
