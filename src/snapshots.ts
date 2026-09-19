import type { BridgeCard } from './integrations'
import type { StoredRecord } from './storage'
import { derivePhaseTheme, type PhaseTone } from './v3Life'

export type LifeSnapshot = {
  month: string
  label: string
  createdAt: string
  updatedAt: string
  recordCount: number
  activeCount: number
  completedCount: number
  phaseTone?: PhaseTone
  topAreas: Array<{ area: string; count: number }>
  activeHighlights: string[]
  preferenceHighlights: string[]
  bridgeSummaries: Array<{ app: string; title: string; summary: string; status?: string }>
}

const KEY = 'eu-life-snapshots-v1'

function monthKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

function monthLabel(date = new Date()) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function listLifeSnapshots(): LifeSnapshot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]') as LifeSnapshot[]
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.month.localeCompare(a.month)) : []
  } catch {
    return []
  }
}

export function captureCurrentLifeSnapshot(records: StoredRecord[], bridges: BridgeCard[]) {
  const publicRecords = records.filter((record) => !record.private)
  const areaCounts = new Map<string, number>()
  publicRecords.forEach((record) => areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1))

  const now = new Date()
  const month = monthKey(now)
  const snapshots = listLifeSnapshots()
  const existing = snapshots.find((snapshot) => snapshot.month === month)

  const snapshot: LifeSnapshot = {
    month,
    label: monthLabel(now),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recordCount: publicRecords.length,
    activeCount: publicRecords.filter((record) => record.status === 'active').length,
    completedCount: publicRecords.filter((record) => record.status === 'completed').length,
    phaseTone: derivePhaseTheme(publicRecords),
    topAreas: [...areaCounts.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
    activeHighlights: publicRecords
      .filter((record) => record.status === 'active')
      .slice(0, 5)
      .map((record) => record.text),
    preferenceHighlights: publicRecords
      .filter((record) => ['Preferência', 'Desejo', 'Pesquisa'].includes(record.type))
      .slice(0, 5)
      .map((record) => record.text),
    bridgeSummaries: bridges
      .filter((card) => card.bridge?.summary)
      .map((card) => ({
        app: card.id,
        title: card.title,
        summary: card.bridge?.summary || '',
        status: card.bridge?.status,
      })),
  }

  const next = [snapshot, ...snapshots.filter((item) => item.month !== month)]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 36)

  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-snapshots-updated'))
  return snapshot
}
