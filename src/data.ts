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
    now: 'Transformando experiência em custos e controladoria em uma carreira híbrida de Finance Analytics.',
    direction: 'Subir para Pleno sem recomeçar do zero e construir a ponte Finanças + Dados.',
    active: ['Plano Mestre 2026–2030', 'PL-300 e SQL', 'Portfólio de Finance Analytics'],
    decisions: 8,
  },
  {
    id: 'dinheiro',
    name: 'Dinheiro',
    status: 'Estável',
    now: 'Vida financeira sendo organizada em sistemas próprios.',
    direction: 'Ganhar previsibilidade para decisões maiores.',
    active: ['Organização financeira'],
    decisions: 5,
  },
  {
    id: 'estudos',
    name: 'Estudos',
    status: 'Em desenvolvimento',
    now: 'Graduação e formação complementar em andamento.',
    direction: 'Transformar aprendizado em repertório aplicável.',
    active: ['Formação atual', 'Dados e idiomas'],
    decisions: 6,
  },
  {
    id: 'casa',
    name: 'Casa',
    status: 'Estável',
    now: 'Rotina doméstica sem pendências críticas registradas.',
    direction: 'Manter a casa funcional e leve.',
    active: [],
    decisions: 1,
  },
  {
    id: 'viagens',
    name: 'Viagens',
    status: 'Estável',
    now: 'Referências e destinos entram no arquivo conforme surgem.',
    direction: 'Viajar com mais intenção e memória.',
    active: [],
    decisions: 3,
  },
  {
    id: 'compras',
    name: 'Compras',
    status: 'Em desenvolvimento',
    now: 'Algumas decisões relevantes estão em pesquisa.',
    direction: 'Comprar menos por impulso e lembrar por que cada escolha foi feita.',
    active: ['Trocar de carro'],
    decisions: 12,
  },
  {
    id: 'lazer',
    name: 'Lazer',
    status: 'Estável',
    now: 'Livros, séries, restaurantes e referências sendo acumulados.',
    direction: 'Guardar o que realmente vale repetir.',
    active: [],
    decisions: 2,
  },
  {
    id: 'pessoal',
    name: 'Pessoal',
    status: 'Em desenvolvimento',
    now: 'Objetivos, preferências e momentos importantes reunidos num só lugar.',
    direction: 'Construir uma memória externa confiável da própria vida.',
    active: ['EU'],
    decisions: 4,
  },
]

export const projects: Project[] = [
  {
    id: 'trocar-de-carro',
    name: 'Trocar de carro',
    area: 'Compras',
    status: 'Ativo',
    deadline: 'Até janeiro',
    resource: 'Faixa de referência: R$ 50 mil',
    phase: 'Pesquisa',
    summary: 'Definir uma troca que faça sentido para o uso diário e para o orçamento.',
    context: 'O projeto começou a partir da vontade de substituir o carro atual sem transformar a compra em pressão financeira.',
    decisions: ['Faixa de preço definida', 'Modelos começaram a ser comparados'],
    next: ['Selecionar candidatos reais', 'Comparar custo total e condições de compra'],
  },
  {
    id: 'evolucao-profissional',
    name: 'Evolução profissional',
    area: 'Carreira',
    status: 'Ativo',
    deadline: 'Ciclo atual',
    phase: 'Construção',
    summary: 'Usar custos e controladoria como base para chegar a Finance Analytics, Senior/Specialist e escopo internacional.',
    context: 'O plano evita uma migração que apague a experiência já construída. A estratégia é somar SQL, Power BI avançado, Python e Fabric ao domínio de negócio.',
    decisions: ['Manter custos/controladoria como vantagem competitiva', 'Buscar o próximo salto já em nível Pleno', 'Usar Analytics como especialização progressiva'],
    next: ['Concluir PL-300', 'Fortalecer SQL', 'Criar os cases Cost & Margin e Inventory & Working Capital', 'Reposicionar CV e LinkedIn'],
  },
  {
    id: 'eu',
    name: 'EU',
    area: 'Pessoal',
    status: 'Ativo',
    deadline: 'Em construção',
    phase: 'Fundação',
    summary: 'Criar um arquivo vivo pessoal para memória, contexto e progresso.',
    context: 'Nasceu da necessidade de reunir decisões, referências, projetos e história pessoal sem transformar a vida em uma lista de tarefas.',
    decisions: ['Nome definido', 'Direção visual definida', 'Cinco perspectivas integradas definidas'],
    next: ['Validar primeira experiência', 'Conectar persistência real'],
  },
]

export const archiveItems = [
  { type: 'Preferência', title: 'Relógios de estética limpa e contemporânea', meta: 'Compras · referência pessoal' },
  { type: 'Decisão', title: 'Criar o EU como arquivo vivo', meta: 'Pessoal · setembro de 2026' },
  { type: 'Nota', title: 'Migrar gradualmente para dados', meta: 'Carreira · direção' },
  { type: 'Projeto', title: 'Trocar de carro', meta: 'Compras · ativo' },
  { type: 'Referência', title: 'Paleta Areia, Azul, Terra e Oliva', meta: 'Projeto EU · visual' },
]
