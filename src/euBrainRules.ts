export type BrainIntent =
  | 'status'
  | 'changed'
  | 'handoff'
  | 'decision'
  | 'waiting'
  | 'people'
  | 'impact'
  | 'search'

function lower(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function brainIntentFor(question: string): BrainIntent {
  const q = lower(question)

  if (/o que mudou|mudou|novidade|desde ontem|essa semana|esta semana/.test(q)) return 'changed'
  if (/onde paramos|onde parei|retomar|continuar|ultimo passo|proximo passo/.test(q)) return 'handoff'
  if (/decidi|decisao|escolhi|escolha/.test(q)) return 'decision'
  if (/quem estou esperando|quem falta|aguardando|esperando resposta|retorno de quem/.test(q)) return 'waiting'
  if (/quem e|pessoa|pessoas|com quem|sobre .*?\b(?:ele|ela)\b/.test(q)) return 'people'
  if (/o que afeta|o que isso afeta|impacta|impacto|se eu fizer|se eu mudar|se eu comprar|se eu aceitar/.test(q)) return 'impact'
  if (/como estou|como ta|o que preciso saber|agora|hoje/.test(q)) return 'status'
  return 'search'
}

export function brainConfidenceForSourceCount(count: number) {
  if (count >= 3) return 'high' as const
  if (count >= 1) return 'medium' as const
  return 'low' as const
}
