import type { BridgeCard } from './integrations'
import type { StoredRecord } from './storage'

export type EcosystemInsight = {
  id: string
  title: string
  detail: string
  tone: 'coral' | 'green' | 'amber' | 'pink'
}

function metric(card: BridgeCard | undefined, key: string) {
  return card?.bridge?.metrics[key]
}

export function deriveEcosystemInsights(records: StoredRecord[], bridges: BridgeCard[]): EcosystemInsight[] {
  const publicRecords = records.filter((record) => !record.private)
  const insights: EcosystemInsight[] = []
  const folego = bridges.find((card) => card.id === 'folego')
  const traco = bridges.find((card) => card.id === 'traco')
  const repertorio = bridges.find((card) => card.id === 'repertorio')

  const activePurchases = publicRecords.filter((record) => record.area === 'Compras' && record.status === 'active')
  const budgetUsed = metric(folego, 'budgetUsedPercent')

  if (activePurchases.length && typeof budgetUsed === 'number') {
    insights.push({
      id: 'money-purchases',
      title: 'Desejo e dinheiro estão se encontrando.',
      detail: 'Você tem ' + activePurchases.length + (activePurchases.length === 1 ? ' compra/pesquisa viva' : ' compras/pesquisas vivas') + ' e o Fôlego registra ' + budgetUsed + '% do orçamento variável usado. Vale olhar os dois juntos antes da próxima decisão.',
      tone: budgetUsed >= 80 ? 'coral' : 'green',
    })
  }

  const careerData = publicRecords.filter((record) =>
    record.area === 'Carreira'
    && /(sql|dados|analytics|power bi|python)/i.test(record.text + ' ' + (record.tags || []).join(' ')),
  )
  const studied = metric(repertorio, 'studiedDaysThisWeek')
  const completed = metric(repertorio, 'completed')

  if (careerData.length && ((typeof studied === 'number' && studied > 0) || (typeof completed === 'number' && completed > 0))) {
    insights.push({
      id: 'learning-career',
      title: 'Seu aprendizado está conversando com sua carreira.',
      detail: 'Dados/analytics aparecem no seu plano profissional e o Repertório já mostra movimento de estudo. Essa conexão merece continuar visível.',
      tone: 'green',
    })
  }

  const workouts = metric(traco, 'workoutsThisWeek')
  const goal = metric(traco, 'weeklyGoal')
  if (typeof workouts === 'number' && typeof goal === 'number' && goal > 0) {
    insights.push({
      id: 'training-rhythm',
      title: workouts >= goal ? 'Treino virou um sinal de consistência nesta fase.' : 'Seu ritmo de treino ainda está se formando nesta semana.',
      detail: workouts + '/' + goal + ' treinos registrados no Traço. O EU guarda isso como contexto da fase, não como cobrança.',
      tone: workouts >= goal ? 'green' : 'amber',
    })
  }

  const activeLearning = publicRecords.filter((record) => record.area === 'Estudos' && record.status === 'active')
  if (activeLearning.length && repertorio?.bridge?.summary) {
    insights.push({
      id: 'learning-loop',
      title: 'Você tem estudo declarado e estudo acontecendo.',
      detail: activeLearning.length + (activeLearning.length === 1 ? ' item de estudo segue vivo' : ' itens de estudo seguem vivos') + ' no EU, enquanto o Repertório registra: ' + repertorio.bridge.summary,
      tone: 'amber',
    })
  }

  return insights.slice(0, 4)
}
