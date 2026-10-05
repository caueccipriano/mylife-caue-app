export type ContextRoute = {
  areas: string[]
  types: string[]
  reason: string
}

export type DriftSignal = {
  id: string
  tone: 'cobalt' | 'amber'
  title: string
  detail: string
  focusArea?: string
}

export type DriftRecord = {
  id: string
  area: string
  createdAt: string
  updatedAt?: string
  status?: string
}

function lower(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function timestamp(record: DriftRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

export function isWaitingText(type?: string, text?: string) {
  const normalizedType = lower(type)
  const normalizedText = lower(text)
  if (normalizedType.includes('aguardando') || normalizedType.includes('espera')) return true
  return [
    'aguardando retorno',
    'aguardando resposta',
    'esperando retorno',
    'esperando resposta',
    'ficou de me responder',
    'ficou de responder',
    'dependendo de',
    'a espera de',
  ].some((term) => normalizedText.includes(term))
}

export function routeLifeOSContext(question: string): ContextRoute {
  const value = lower(question)
  const areas: string[] = []
  const types: string[] = []

  const addArea = (area: string, terms: string[]) => {
    if (terms.some((term) => value.includes(lower(term)))) areas.push(area)
  }
  addArea('Carreira', ['trabalho', 'carreira', 'vaga', 'emprego', 'curriculo', 'entrevista', 'salario', 'dados', 'sql', 'power bi'])
  addArea('Dinheiro', ['dinheiro', 'gasto', 'conta', 'cartao', 'invest', 'orcamento', 'salario'])
  addArea('Estudos', ['estudo', 'curso', 'faculdade', 'prova', 'certificacao', 'sql'])
  addArea('Compras', ['comprar', 'compra', 'preco', 'carro', 'produto'])
  addArea('Viagens', ['viagem', 'viajar', 'hotel', 'passagem'])
  addArea('Casa', ['casa', 'apartamento', 'aluguel'])
  addArea('Lazer', ['filme', 'serie', 'livro', 'show', 'restaurante'])

  if (['decidi', 'decisao'].some((term) => value.includes(term))) types.push('Decisão')
  if (['projeto', 'projetos'].some((term) => value.includes(term))) types.push('Projeto')
  if (['objetivo', 'meta'].some((term) => value.includes(term))) types.push('Objetivo')
  if (['aguardando', 'esperando', 'retorno'].some((term) => value.includes(term))) types.push('Aguardando')
  if (['candidatura', 'candidatei', 'vaga'].some((term) => value.includes(term))) types.push('Candidatura')

  return {
    areas: [...new Set(areas)],
    types: [...new Set(types)],
    reason: areas.length || types.length ? 'contexto específico identificado na pergunta' : 'busca geral no arquivo',
  }
}

export function deriveDriftSignalsCore(records: DriftRecord[], focusAreas: string[], now = Date.now()) {
  if (!focusAreas.length) return [] as DriftSignal[]
  const active = records.filter((record) => record.status === 'active' || record.status == null)
  const recent = active.filter((record) => timestamp(record) >= now - 14 * 86400000)
  const counts = new Map<string, number>()
  recent.forEach((record) => counts.set(record.area, (counts.get(record.area) || 0) + 1))

  const signals: DriftSignal[] = []
  focusAreas.forEach((area) => {
    const focusCount = counts.get(area) || 0
    const latest = active.filter((record) => record.area === area).sort((a, b) => timestamp(b) - timestamp(a))[0]
    const idleDays = latest ? Math.floor((now - timestamp(latest)) / 86400000) : null
    if (focusCount === 0 && idleDays !== null && idleDays >= 10) {
      signals.push({
        id: 'neglected:' + area,
        tone: 'amber',
        title: area + ' saiu do radar',
        detail: 'Você marcou ' + area + ' como foco, mas o último movimento registrado foi há ' + idleDays + ' dias.',
        focusArea: area,
      })
    }
  })

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && !focusAreas.includes(top[0]) && top[1] >= 4) {
    const focusTotal = focusAreas.reduce((sum, area) => sum + (counts.get(area) || 0), 0)
    if (top[1] > focusTotal) {
      signals.push({
        id: 'attention:' + top[0],
        tone: 'cobalt',
        title: 'Sua atenção foi mais para ' + top[0],
        detail: top[1] + ' movimentos recentes apareceram em ' + top[0] + ', mais do que nos focos definidos juntos.',
      })
    }
  }
  return signals.slice(0, 3)
}


export type WaitingRecord = DriftRecord & {
  text: string
  type: string
  followUpAt?: string
}

export function deriveWaitingCore<T extends WaitingRecord>(records: T[]) {
  return records
    .filter((record) => record.status !== 'completed' && record.status !== 'abandoned')
    .filter((record) => isWaitingText(record.type, record.text))
    .sort((a, b) => {
      const af = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      const bf = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.MAX_SAFE_INTEGER
      return af - bf || timestamp(b) - timestamp(a)
    })
}
