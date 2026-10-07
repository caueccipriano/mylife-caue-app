import { useEffect, useMemo } from 'react'
import { useBridges, useRecords } from './appState'
import { writeLocalSyncVault } from './syncVault'

export default function VaultAutoSync() {
  const records = useRecords()
  const { bridges } = useBridges()
  const signature = useMemo(() => JSON.stringify({
    records: records.map((record) => [record.id, record.updatedAt || record.createdAt, record.status, record.trashedAt || null]),
    bridges: bridges.map((bridge) => [bridge.id, bridge.bridge?.updatedAt || null, bridge.bridge?.status || null, bridge.bridge?.summary || null]),
  }), [records, bridges])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void writeLocalSyncVault(records, bridges).catch(() => {
        // O cofre é auxiliar e nunca deve impedir o EU de abrir.
      })
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [signature])

  return null
}
