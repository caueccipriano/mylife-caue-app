import { useEffect } from 'react'
import { useRecords } from './appState'
import { applyPhaseTheme } from './v3Life'

export default function PhaseThemeSync() {
  const records = useRecords()

  useEffect(() => {
    applyPhaseTheme(records)
  }, [records])

  return null
}
