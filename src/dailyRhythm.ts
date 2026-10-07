import type { BridgeCard } from './integrations'
import type { MoodCheckin, StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import { getLastBackupAt } from './securitySettings'
import type { EuIconName } from './v2Ui'

export type DailyRhythm = {
  period: 'morning' | 'day' | 'evening'
  eyebrow: string
  title: string
  detail: string
  actionLabel: string
  actionTo: string
  icon: EuIconName
}

function sameDay(value: string, now = new Date()) {
  const date = new Date(value)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function timeOf(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

export function deriveDailyRhythm(records: StoredRecord[], bridges: BridgeCard[], mood: MoodCheckin | null, now = new Date()): DailyRhythm {
  const visible = records.filter(isRecordVisibleForInsights)
  const hour = now.getHours()
  const due = visible
    .filter((record) => record.status === 'active' && record.followUpAt && new Date(record.followUpAt).getTime() <= now.getTime())
    .sort((a, b) => String(a.followUpAt).localeCompare(String(b.followUpAt)))
  const stale = visible
    .filter((record) => record.status === 'active' && timeOf(record) < now.getTime() - 12 * 86400000)
    .sort((a, b) => timeOf(a) - timeOf(b))
  const todayCaptured = visible.filter((record) => sameDay(record.createdAt, now))
  const todayCompleted = visible.filter((record) => record.status === 'completed' && record.completedAt && sameDay(record.completedAt, now))
  const money = bridges.find((bridge) => bridge.id === 'folego')?.bridge
  const backup = getLastBackupAt()
  const backupAge = backup ? Math.floor((now.getTime() - new Date(backup).getTime()) / 86400000) : null

  if (hour < 12) {
    if (due[0]) return { period:'morning', eyebrow:'MANHÃ', title:'Comece por uma coisa, não por dez.', detail:'“' + due[0].text.slice(0, 78) + (due[0].text.length > 78 ? '…' : '') + '” já voltou para você.', actionLabel:'abrir agora', actionTo:'/registro/' + due[0].id, icon:'sun' }
    if (typeof money?.metrics.topGoalName === 'string') return { period:'morning', eyebrow:'MANHÃ', title:'Seu dia já tem contexto.', detail:'A meta ' + money.metrics.topGoalName + (typeof money.metrics.topGoalProgress === 'number' ? ' está em ' + money.metrics.topGoalProgress + '%.' : '.') + ' Não precisa virar urgência; só continuar visível.', actionLabel:'ver Dinheiro', actionTo:'/dinheiro', icon:'sun' }
    return { period:'morning', eyebrow:'MANHÃ', title:'Abra espaço antes de preencher o dia.', detail:mood ? 'Seu check-in já está salvo. Escolha só uma coisa para mover primeiro.' : 'Faça um check-in rápido e escolha só uma coisa para mover primeiro.', actionLabel:'ver Central', actionTo:'/sistema', icon:'sun' }
  }

  if (hour >= 18) {
    if (todayCompleted.length || todayCaptured.length) return { period:'evening', eyebrow:'FECHAMENTO', title:'Hoje já deixou rastros.', detail:todayCompleted.length + ' concluído' + (todayCompleted.length === 1 ? '' : 's') + ' · ' + todayCaptured.length + ' registro' + (todayCaptured.length === 1 ? '' : 's') + ' novo' + (todayCaptured.length === 1 ? '' : 's') + '. O resto pode continuar amanhã.', actionLabel:'ver Memórias', actionTo:'/memorias?period=30', icon:'moon' }
    if (backupAge === null || backupAge > 30) return { period:'evening', eyebrow:'FECHAMENTO', title:'Um minuto de cuidado com seu arquivo.', detail:'Seu backup seguro está ' + (backupAge === null ? 'sem histórico' : 'há ' + backupAge + ' dias sem atualização') + '.', actionLabel:'cuidar do backup', actionTo:'/seguranca#data', icon:'shield' }
    return { period:'evening', eyebrow:'FECHAMENTO', title:'Nem todo dia precisa deixar uma grande marca.', detail:'Se algo mudou, registre. Se não mudou, fechar o dia também é uma ação válida.', actionLabel:'abrir Memórias', actionTo:'/memorias', icon:'moon' }
  }

  if (stale[0]) return { period:'day', eyebrow:'NO RADAR', title:'Uma coisa está ficando para trás.', detail:'“' + stale[0].text.slice(0, 82) + (stale[0].text.length > 82 ? '…' : '') + '” está há mais de 12 dias sem movimento.', actionLabel:'decidir o próximo passo', actionTo:'/registro/' + stale[0].id, icon:'clock' }
  return { period:'day', eyebrow:'RITMO DO DIA', title:'Continue sem abrir novas frentes.', detail:'O EU não encontrou uma urgência nova. Use o que já está em movimento antes de adicionar mais.', actionLabel:'ver Central', actionTo:'/sistema', icon:'compass' }
}
