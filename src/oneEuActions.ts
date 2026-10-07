import type { OneEuConnection } from './oneEu'
import { nextFollowUpDate, saveRecord } from './storage'

export async function createActionFromConnection(connection: OneEuConnection) {
  const area = connection.areas[0] || 'Pessoal'
  const now = new Date()
  const id = crypto.randomUUID()
  await saveRecord({
    id,
    text: 'Próximo passo: ' + connection.title,
    type: 'Pendência',
    area,
    createdAt: now.toISOString(),
    source: 'manual',
    status: 'active',
    startedAt: now.toISOString(),
    nextMove: connection.actionLabel,
    whyItMatters: connection.detail,
    followUpDays: 7,
    followUpAt: nextFollowUpDate(7, now),
    relatedIds: connection.sourceRecordIds,
    tags: ['one-eu', 'próximo-passo'],
  })
  window.dispatchEvent(new Event('eu-record-saved'))
  return id
}
