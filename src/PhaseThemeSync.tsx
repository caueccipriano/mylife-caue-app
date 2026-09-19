import { useEffect } from 'react'
import { useBridges, useRecords } from './appState'
import { applyPhaseTheme } from './v3Life'
import { writeLocalSyncVault } from './syncVault'

export default function PhaseThemeSync() {
  const records = useRecords()
  const { bridges } = useBridges()

  useEffect(() => {
    applyPhaseTheme(records)
  }, [records])

  useEffect(() => {
    if (!records.length && !bridges.some((card) => card.bridge)) return
    const timer = window.setTimeout(() => {
      void writeLocalSyncVault(records, bridges)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [records, bridges])

  return null
}
