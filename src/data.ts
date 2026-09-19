export type Area = {
  id: string
  name: string
  status: 'Em desenvolvimento' | 'Estável' | 'Pausada'
  now: string
  direction: string
  active: string[]
  decisions: number
}

export type Project = {
  id: string
  name: string
  area: string
  status: 'Ativo' | 'Pausado' | 'Concluído'
  deadline: string
  resource?: string
  phase: string
  summary: string
  context: string
  decisions: string[]
  next: string[]
}

export const areas: Area[] = [
  {
    id: 'carreira',
    name: 'Carreira',
    status: 'Em desenvolvimento',
    now: 'Registre movimentos, decisões, aprendizados e mudanças profissionais.',
    direction: 'O EU monta contexto profissional a partir do que você realmente registra.',
    active: [],
    decisions: 0,
  },
  {
    id: 'dinheiro',
    name: 'Dinheiro',
    status: 'Estável',
    now: 'Entradas, decisões e prioridades financeiras aparecem conforme surgem.',
    direction: 'Manter clareza sem transformar finanças em ansiedade.',
    active: [],
    decisions: 0,
  },
  {
    id: 'estudos',
    name: 'Estudos',
    status: 'Em desenvolvimento',
    now: 'Cursos, leituras e aprendizados podem ficar conectados ao que você quer construir.',
    direction: 'Transformar aprendizado em repertório aplicável.',
    active: [],
    decisions: 0,
  },
  {
    id: 'casa',
    name: 'Casa',
    status: 'Estável',
    now: 'Rotina, mudanças e referências domésticas ficam reunidas aqui.',
    direction: 'Manter a vida prática leve e funcional.',
    active: [],
    decisions: 0,
  },
  {
    id: 'viagens',
    name: 'Viagens',
    status: 'Estável',
    now: 'Destinos, memórias e planos de viagem entram quando fizerem sentido.',
    direction: 'Guardar lugares e experiências sem virar checklist.',
    active: [],
    decisions: 0,
  },
  {
    id: 'compras',
    name: 'Compras',
    status: 'Em desenvolvimento',
    now: 'Desejos, pesquisas e compras podem ter história antes e depois da decisão.',
    direction: 'Lembrar o que chamou atenção e o que realmente valeu a pena.',
    active: [],
    decisions: 0,
  },
  {
    id: 'lazer',
    name: 'Lazer',
    status: 'Estável',
    now: 'Livros, séries, restaurantes e referências ficam fáceis de reencontrar.',
    direction: 'Guardar o que merece ser repetido.',
    active: [],
    decisions: 0,
  },
  {
    id: 'pessoal',
    name: 'Pessoal',
    status: 'Em desenvolvimento',
    now: 'Preferências, marcos e contextos pessoais ficam organizados sem exposição pública.',
    direction: 'Construir uma memória externa confiável da própria vida.',
    active: [],
    decisions: 0,
  },
]

export const projects: Project[] = []

export const archiveItems: Array<{ type: string; title: string; meta: string }> = []
