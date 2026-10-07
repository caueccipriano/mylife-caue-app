import { useEffect } from 'react'
import { useBridges, useRecords } from './appState'
import { writeLocalSyncVault } from './syncVault'

export default function VaultAutoSync() {
  const records = useRecords()
  const { bridges } = useBridges()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void writeLocalSyncVault(records, bridges).catch(() => {
        // O cofre é auxiliar e nunca deve impedir o EU de abrir.
      })
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [records, bridges])

  return null
}
