import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from 'astronomy-engine'

export type NatalPoint = {
  name: string
  symbol: string
  longitude: number
  house?: number
  retrograde?: boolean
}

export type DailyTransit = {
  name: string
  symbol: string
  longitude: number
  siderealLongitude: number
}

export type DailySignal = {
  id: string
  title: string
  detail: string
  tone: 'green' | 'amber' | 'coral' | 'pink'
  strength: number
}

export type DailyAstrology = {
  date: Date
  dayLabel: string
  headline: string
  summary: string
  transits: DailyTransit[]
  signals: DailySignal[]
}

export const westernNatal: NatalPoint[] = [
  { name: 'Ascendente', symbol: 'ASC', longitude: 276.2516, house: 1 },
  { name: 'Sol', symbol: '☉', longitude: 172.5767, house: 9 },
  { name: 'Lua', symbol: '☾', longitude: 114.3086, house: 7 },
  { name: 'Mercúrio', symbol: '☿', longitude: 163.6103, house: 9 },
  { name: 'Vênus', symbol: '♀', longitude: 160.9285, house: 9 },
  { name: 'Marte', symbol: '♂', longitude: 136.4330, house: 8 },
  { name: 'Júpiter', symbol: '♃', longitude: 353.1206, house: 3, retrograde: true },
  { name: 'Saturno', symbol: '♄', longitude: 32.8211, house: 5, retrograde: true },
  { name: 'Urano', symbol: '♅', longitude: 309.2511, house: 2, retrograde: true },
  { name: 'Netuno', symbol: '♆', longitude: 299.5651, house: 1, retrograde: true },
  { name: 'Plutão', symbol: '♇', longitude: 245.5514, house: 12 },
  { name: 'Nodo Norte', symbol: '☊', longitude: 150.0821, house: 9 },
  { name: 'MC', symbol: 'MC', longitude: 176.0136, house: 10 },
]

export const vedicNatal: NatalPoint[] = [
  { name: 'Ascendente', symbol: 'ASC', longitude: 252.4149, house: 1 },
  { name: 'Sol', symbol: '☉', longitude: 148.7400, house: 9 },
  { name: 'Lua', symbol: '☾', longitude: 90.4719, house: 8 },
  { name: 'Mercúrio', symbol: '☿', longitude: 139.7736, house: 9 },
  { name: 'Vênus', symbol: '♀', longitude: 137.0918, house: 9 },
  { name: 'Marte', symbol: '♂', longitude: 112.5963, house: 8 },
  { name: 'Júpiter', symbol: '♃', longitude: 329.2839, house: 3, retrograde: true },
  { name: 'Saturno', symbol: '♄', longitude: 8.9844, house: 5, retrograde: true },
  { name: 'Rahu', symbol: '☊', longitude: 126.2455, house: 9 },
  { name: 'Ketu', symbol: '☋', longitude: 306.2455, house: 3 },
]

const signs = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
]

const signSymbols = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']

export function normalize(value: number) {
  return ((value % 360) + 360) % 360
}

export function zodiacPosition(longitude: number) {
  const lon = normalize(longitude)
  const index = Math.floor(lon / 30)
  const within = lon % 30
  const degree = Math.floor(within)
  const minute = Math.round((within - degree) * 60)
  const normalizedDegree = minute === 60 ? degree + 1 : degree
  const normalizedMinute = minute === 60 ? 0 : minute
  return {
    sign: signs[index],
    symbol: signSymbols[index],
    degree: normalizedDegree,
    minute: normalizedMinute,
    text: signs[index] + ' ' + String(normalizedDegree).padStart(2, '0') + '°' + String(normalizedMinute).padStart(2, '0') + '′',
  }
}

export function lahiriAyanamsa(date: Date) {
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const nextYear = new Date(date.getFullYear() + 1, 0, 1)
  const fraction = (date.getTime() - yearStart.getTime()) / (nextYear.getTime() - yearStart.getTime())
  const year = date.getFullYear() + fraction
  return 23.85476 + (year - 2000) * 0.013969
}

function planetLongitude(body: Body, date: Date) {
  return normalize(Ecliptic(GeoVector(body, date, true)).elon)
}

function dailyNoon(date: Date) {
  const value = new Date(date)
  value.setHours(12, 0, 0, 0)
  return value
}

export function currentTransits(date = new Date()): DailyTransit[] {
  const moment = dailyNoon(date)
  const ayanamsa = lahiriAyanamsa(moment)
  const raw = [
    { name: 'Sol', symbol: '☉', longitude: normalize(SunPosition(moment).elon) },
    { name: 'Lua', symbol: '☾', longitude: normalize(EclipticGeoMoon(moment).lon) },
    { name: 'Mercúrio', symbol: '☿', longitude: planetLongitude(Body.Mercury, moment) },
    { name: 'Vênus', symbol: '♀', longitude: planetLongitude(Body.Venus, moment) },
    { name: 'Marte', symbol: '♂', longitude: planetLongitude(Body.Mars, moment) },
    { name: 'Júpiter', symbol: '♃', longitude: planetLongitude(Body.Jupiter, moment) },
    { name: 'Saturno', symbol: '♄', longitude: planetLongitude(Body.Saturn, moment) },
    { name: 'Urano', symbol: '♅', longitude: planetLongitude(Body.Uranus, moment) },
    { name: 'Netuno', symbol: '♆', longitude: planetLongitude(Body.Neptune, moment) },
    { name: 'Plutão', symbol: '♇', longitude: planetLongitude(Body.Pluto, moment) },
  ]

  return raw.map((item) => ({
    ...item,
    siderealLongitude: normalize(item.longitude - ayanamsa),
  }))
}

const aspects = [
  { angle: 0, name: 'conjunção', base: 1.0 },
  { angle: 60, name: 'sextil', base: .72 },
  { angle: 90, name: 'quadratura', base: .88 },
  { angle: 120, name: 'trígono', base: .82 },
  { angle: 180, name: 'oposição', base: .94 },
]

const transitWeight: Record<string, number> = {
  Lua: .55,
  Mercúrio: .72,
  Vênus: .76,
  Sol: .8,
  Marte: .9,
  Júpiter: 1.15,
  Saturno: 1.18,
  Urano: 1.05,
  Netuno: .98,
  Plutão: 1.12,
}

const transitOrb: Record<string, number> = {
  Lua: 3.2,
  Mercúrio: 3.2,
  Vênus: 3.5,
  Sol: 3.5,
  Marte: 4.2,
  Júpiter: 5.2,
  Saturno: 5.2,
  Urano: 4.5,
  Netuno: 4.5,
  Plutão: 4.5,
}

function angularDistance(a: number, b: number) {
  const diff = Math.abs(normalize(a) - normalize(b))
  return Math.min(diff, 360 - diff)
}

function closestAspect(distance: number, orb: number) {
  return aspects
    .map((aspect) => ({ ...aspect, delta: Math.abs(distance - aspect.angle) }))
    .filter((aspect) => aspect.delta <= orb)
    .sort((a, b) => a.delta - b.delta)[0]
}

function signalCopy(transit: string, aspect: string, natal: string) {
  const supportive = aspect === 'trígono' || aspect === 'sextil'
  const intense = aspect === 'quadratura' || aspect === 'oposição'

  if (transit === 'Júpiter') {
    if (natal === 'Mercúrio' || natal === 'MC') return ['Carreira & expansão', supportive ? 'Bom dia para ampliar contatos, estudar, apresentar ideias e olhar oportunidades com mais ambição.' : 'O desejo de crescer fica maior. Vale separar oportunidade real de excesso de expectativa antes de decidir.', 'green'] as const
    if (natal === 'Vênus') return ['Dinheiro & relações', supportive ? 'Há uma tendência simbólica de mais abertura para prazer, conexões e escolhas materiais. Aproveite sem exagerar.' : 'Vontades e gastos podem crescer junto com o otimismo. Curta, mas preserve medida.', 'pink'] as const
    return ['Expansão', supportive ? 'O céu favorece olhar mais longe e dar espaço a oportunidades que ampliem seu repertório.' : 'A ambição está alta; crescer funciona melhor com direção do que com pressa.', 'green'] as const
  }

  if (transit === 'Saturno') {
    if (natal === 'Mercúrio' || natal === 'MC' || natal === 'Sol') return ['Estrutura & carreira', intense ? 'O dia pede paciência com cobrança, prazos e responsabilidade. O melhor uso dessa energia é organizar e entregar o essencial.' : 'Disciplina e foco podem render bastante hoje, principalmente em trabalho, estudo e decisões de longo prazo.', 'amber'] as const
    return ['Estrutura', intense ? 'Limites ficam mais visíveis. Não é um dia ruim: é um dia para reduzir ruído e lidar com o que realmente precisa de estrutura.' : 'Consistência vale mais do que velocidade. Um passo bem feito tende a render mais do que começar cinco coisas.', 'amber'] as const
  }

  if (transit === 'Marte') {
    if (natal === 'Lua' || natal === 'Vênus') return ['Emoções & impulso', intense ? 'Reações podem vir mais rápidas. Antes de responder no automático, vale conferir se o tamanho da reação combina com a situação.' : 'Coragem emocional e iniciativa estão mais disponíveis. Use para resolver, não para provocar conflito.', 'coral'] as const
    return ['Ação', intense ? 'Energia e impaciência sobem juntas. Canalizar isso para treino, trabalho ou uma decisão concreta tende a funcionar melhor.' : 'Há boa energia para agir, cortar enrolação e avançar em algo que vinha parado.', 'coral'] as const
  }

  if (transit === 'Vênus') {
    return ['Relações & prazer', intense ? 'Desejos, expectativas e sensibilidade nas relações ficam mais evidentes. Evite transformar preferência em cobrança.' : 'Convívio, estética, prazer e diplomacia ficam favorecidos. Bom momento para aproximar, conversar e cuidar do que você gosta.', 'pink'] as const
  }

  if (transit === 'Mercúrio') {
    return ['Mente & comunicação', intense ? 'A cabeça pode ficar acelerada ou mais crítica. Revise mensagens, números e decisões antes de concluir.' : 'Conversas, estudos, organização e tarefas analíticas tendem a fluir melhor. Aproveite para colocar ideias em palavras.', 'green'] as const
  }

  if (transit === 'Urano') return ['Mudança', 'Algo pode pedir uma abordagem diferente da habitual. Flexibilidade tende a funcionar melhor do que tentar controlar cada detalhe.', 'coral'] as const
  if (transit === 'Netuno') return ['Intuição & clareza', 'Sensibilidade e imaginação ficam fortes, mas confirme fatos antes de transformar sensação em certeza.', 'pink'] as const
  if (transit === 'Plutão') return ['Transformação', 'Um tema pode parecer mais intenso ou definitivo. Use a profundidade para entender a raiz antes de agir.', 'amber'] as const
  if (transit === 'Lua') return ['Emoções do dia', intense ? 'O humor pode oscilar mais. Dê espaço para sentir sem tratar cada emoção como uma decisão.' : 'Sua percepção emocional está mais afinada hoje. Observe o que se repete antes de reagir.', 'pink'] as const

  return ['Foco do dia', supportive ? 'O dia favorece colocar energia no que já importa para você.' : 'Vale equilibrar vontade de agir com leitura do contexto.', 'green'] as const
}

function buildSignals(transits: DailyTransit[]) {
  const targets = westernNatal.filter((point) => ['Sol','Lua','Mercúrio','Vênus','Marte','Júpiter','Saturno','Ascendente','MC'].includes(point.name))
  const candidates: DailySignal[] = []

  for (const transit of transits) {
    for (const natal of targets) {
      const orb = transitOrb[transit.name] ?? 3
      const distance = angularDistance(transit.longitude, natal.longitude)
      const aspect = closestAspect(distance, orb)
      if (!aspect) continue

      const [title, detail, tone] = signalCopy(transit.name, aspect.name, natal.name)
      const closeness = Math.max(0, 1 - aspect.delta / orb)
      const strength = (transitWeight[transit.name] ?? .7) * aspect.base * (.55 + closeness * .45)

      candidates.push({
        id: transit.name + '-' + aspect.name + '-' + natal.name,
        title,
        detail: detail + ' · ' + transit.name + ' em ' + aspect.name + ' com seu ' + natal.name + '.',
        tone,
        strength,
      })
    }
  }

  const dedup = new Map<string, DailySignal>()
  for (const item of candidates.sort((a, b) => b.strength - a.strength)) {
    if (!dedup.has(item.title)) dedup.set(item.title, item)
  }

  return [...dedup.values()].slice(0, 4)
}

function fallbackSignal(date: Date): DailySignal {
  const moon = currentTransits(date).find((item) => item.name === 'Lua')
  const moonSign = moon ? zodiacPosition(moon.longitude).sign : 'do dia'
  return {
    id: 'fallback',
    title: 'Clima do dia',
    detail: 'Sem um aspecto muito exato dominando o céu, vale usar o dia de forma mais simples: observar ritmo, prioridades e emoções. A Lua passa por ' + moonSign + '.',
    tone: 'green',
    strength: .3,
  }
}

export function dailyAstrology(date = new Date()): DailyAstrology {
  const moment = dailyNoon(date)
  const transits = currentTransits(moment)
  const signals = buildSignals(transits)
  if (!signals.length) signals.push(fallbackSignal(moment))

  const main = signals[0]
  const dayLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(moment)

  return {
    date: moment,
    dayLabel,
    headline: main.title,
    summary: main.detail.split(' · ')[0],
    transits,
    signals,
  }
}
