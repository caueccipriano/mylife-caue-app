import { suggestTags, type StoredRecord } from './storage'

const SIMPLE_DAY_KEY = 'eu-simple-day-v1'

export type PhaseTone = 'cobalt' | 'green' | 'amber' | 'pink' | 'lilac' | 'wine' | 'sky' | 'lime'

export function getSimpleDayMode() {
  return localStorage.getItem(SIMPLE_DAY_KEY) === '1'
}

export function setSimpleDayMode(enabled: boolean) {
  localStorage.setItem(SIMPLE_DAY_KEY, enabled ? '1' : '0')
  window.dispatchEvent(new Event('eu-simple-day-updated'))
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#\s-]/g, ' ')
}

const synonymGroups = [
  ['carro', 'veiculo', 'automovel', 'onix', 'gol'],
  ['relogio', 'casio', 'watch'],
  ['trabalho', 'carreira', 'vaga', 'emprego', 'cargo'],
  ['dados', 'analytics', 'sql', 'python', 'powerbi', 'power bi'],
  ['dinheiro', 'financas', 'orcamento', 'cartao', 'banco'],
  ['curso', 'estudo', 'aula', 'certificacao', 'aprender'],
  ['viagem', 'cidade', 'hotel', 'passeio', 'roteiro'],
  ['comprar', 'compra', 'produto', 'preco', 'pesquisa'],
  ['treino', 'academia', 'musculacao', 'cardio', 'corpo'],
  ['livro', 'leitura', 'kindle', 'thriller'],
]

function expandTokens(value: string) {
  const tokens = normalize(value).split(/\s+/).filter((token) => token.length > 1)
  const expanded = new Set(tokens)

  for (const token of tokens) {
    for (const group of synonymGroups) {
      if (group.some((term) => normalize(term) === token)) {
        group.forEach((term) => expanded.add(normalize(term)))
      }
    }
  }

  return [...expanded]
}

export function semanticSearchLocal(records: StoredRecord[], query: string) {
  const queryTokens = expandTokens(query)
  if (!queryTokens.length) return records

  return records
    .filter((record) => {
      if (record.private || record.trashedAt) return false
      if (record.revealAt && !record.capsuleOpenedAt && new Date(record.revealAt).getTime() > Date.now()) return false
      return true
    })
    .map((record) => {
      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      const haystack = expandTokens([
        record.text,
        record.area,
        record.type,
        record.whyItMatters || '',
        record.nextMove || '',
        record.objectName || '',
        record.place || '',
        record.chapterId || '',
        ...tags,
      ].join(' '))

      const hay = new Set(haystack)
      let score = 0

      for (const token of queryTokens) {
        if (hay.has(token)) score += 3
        else if (haystack.some((candidate) => candidate.includes(token) || token.includes(candidate))) score += 1
      }

      if (record.favorite) score += .4
      if (record.status === 'active') score += .25

      return { record, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.record.createdAt.localeCompare(a.record.createdAt))
    .map(({ record }) => record)
}

function recordTags(record: StoredRecord) {
  return record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
}

export function derivePhaseTheme(records: StoredRecord[]): PhaseTone {
  const recent = records.filter((record) => !record.private && !record.trashedAt && new Date(record.createdAt).getTime() > Date.now() - 45 * 86400000)
  const counts = new Map<string, number>()

  recent.forEach((record) => counts.set(record.area, (counts.get(record.area) || 0) + 1))
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() || ''

  if (top.includes('carreira')) return 'green'
  if (top.includes('estudo')) return 'lime'
  if (top.includes('dinheiro')) return 'cobalt'
  if (top.includes('compra')) return 'pink'
  if (top.includes('viag')) return 'sky'
  if (top.includes('pessoal')) return 'lilac'
  if (top.includes('lazer')) return 'amber'
  return 'cobalt'
}

export function applyPhaseTheme(records: StoredRecord[]) {
  const tone = derivePhaseTheme(records)
  document.documentElement.dataset.euPhase = tone
  return tone
}

export type RadarTopic = {
  label: string
  count: number
  trend: 'up' | 'down' | 'steady' | 'new'
  delta: number
}

function countTopics(records: StoredRecord[]) {
  const counts = new Map<string, number>()
  records.forEach((record) => {
    const tags = recordTags(record)
    const topics = tags.length ? tags : [record.area.toLowerCase()]
    topics.forEach((topic) => counts.set(topic, (counts.get(topic) || 0) + 1))
  })
  return counts
}

export function deriveRadar(records: StoredRecord[]): RadarTopic[] {
  const publicRecords = records.filter((record) => !record.private && !record.trashedAt)
  const now = Date.now()
  const current = publicRecords.filter((record) => {
    const time = new Date(record.createdAt).getTime()
    return time >= now - 30 * 86400000
  })
  const previous = publicRecords.filter((record) => {
    const time = new Date(record.createdAt).getTime()
    return time < now - 30 * 86400000 && time >= now - 60 * 86400000
  })

  const currentCounts = countTopics(current)
  const previousCounts = countTopics(previous)
  const all = new Set([...currentCounts.keys(), ...previousCounts.keys()])

  return [...all]
    .map((label) => {
      const count = currentCounts.get(label) || 0
      const before = previousCounts.get(label) || 0
      const delta = count - before
      const trend: RadarTopic['trend'] = before === 0 && count > 0 ? 'new' : delta >= 2 ? 'up' : delta <= -2 ? 'down' : 'steady'
      return { label, count, trend, delta }
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || b.delta - a.delta)
    .slice(0, 14)
}

export type LifeChange = {
  id: string
  label: string
  detail: string
  tone: PhaseTone
  direction: 'up' | 'down' | 'new' | 'closed' | 'steady'
}

export function deriveChanges(records: StoredRecord[]): LifeChange[] {
  const publicRecords = records.filter((record) => !record.private && !record.trashedAt)
  const radar = deriveRadar(publicRecords)
  const changes: LifeChange[] = []

  radar.filter((item) => item.trend !== 'steady').slice(0, 5).forEach((item) => {
    changes.push({
      id: 'topic-' + item.label,
      label: '#' + item.label,
      detail: item.trend === 'new'
        ? 'Apareceu como um tema novo nos últimos 30 dias.'
        : item.trend === 'up'
          ? 'Cresceu em presença: +' + item.delta + ' aparições em relação ao período anterior.'
          : 'Perdeu espaço: ' + Math.abs(item.delta) + ' aparições a menos.',
      tone: item.trend === 'up' ? 'green' : item.trend === 'new' ? 'sky' : 'lilac',
      direction: item.trend,
    })
  })

  const last30 = publicRecords.filter((record) => new Date(record.updatedAt || record.createdAt).getTime() >= Date.now() - 30 * 86400000)
  const completed = last30.filter((record) => record.status === 'completed').length
  const outcomes = last30.filter((record) => record.outcome && record.outcome !== 'unknown')

  if (completed) {
    changes.push({
      id: 'completed',
      label: completed === 1 ? '1 ciclo fechou' : completed + ' ciclos fecharam',
      detail: 'Coisas que estavam em movimento chegaram a uma conclusão neste período.',
      tone: 'green',
      direction: 'closed',
    })
  }

  if (outcomes.length) {
    const good = outcomes.filter((record) => record.outcome === 'good').length
    changes.push({
      id: 'outcomes',
      label: 'Decisões ganharam consequência',
      detail: good + '/' + outcomes.length + ' avaliações recentes foram marcadas como boas escolhas.',
      tone: good >= Math.ceil(outcomes.length / 2) ? 'cobalt' : 'amber',
      direction: 'steady',
    })
  }

  return changes.slice(0, 8)
}

export type LifeGraphNode = {
  id: string
  label: string
  kind: 'area' | 'tag' | 'record'
  weight: number
  tone: PhaseTone
}

export type LifeGraphEdge = {
  from: string
  to: string
  strength: number
}

export function deriveLifeGraph(records: StoredRecord[]) {
  const publicRecords = records.filter((record) => !record.private && !record.trashedAt)
  const recent = publicRecords.filter((record) => new Date(record.updatedAt || record.createdAt).getTime() > Date.now() - 120 * 86400000)
  const nodes = new Map<string, LifeGraphNode>()
  const edges = new Map<string, LifeGraphEdge>()

  function upsertNode(node: LifeGraphNode) {
    const existing = nodes.get(node.id)
    nodes.set(node.id, existing ? { ...existing, weight: existing.weight + node.weight } : node)
  }

  function addEdge(from: string, to: string, strength = 1) {
    const key = [from, to].sort().join('::')
    const existing = edges.get(key)
    edges.set(key, existing ? { ...existing, strength: existing.strength + strength } : { from, to, strength })
  }

  const toneByArea = (area: string): PhaseTone => {
    const value = area.toLowerCase()
    if (value.includes('carreira')) return 'green'
    if (value.includes('estudo')) return 'lime'
    if (value.includes('dinheiro')) return 'cobalt'
    if (value.includes('compra')) return 'pink'
    if (value.includes('viag')) return 'sky'
    return 'lilac'
  }

  recent.forEach((record) => {
    const areaId = 'area:' + record.area.toLowerCase()
    upsertNode({ id: areaId, label: record.area, kind: 'area', weight: 2, tone: toneByArea(record.area) })

    const tags = recordTags(record).slice(0, 5)
    tags.forEach((tag) => {
      const tagId = 'tag:' + tag
      upsertNode({ id: tagId, label: '#' + tag, kind: 'tag', weight: 1, tone: toneByArea(record.area) })
      addEdge(areaId, tagId, 2)
    })

    if (record.status === 'active' || record.favorite || record.type === 'Decisão') {
      const recordId = 'record:' + record.id
      upsertNode({ id: recordId, label: record.text.slice(0, 46), kind: 'record', weight: 1.5, tone: toneByArea(record.area) })
      addEdge(areaId, recordId, 2)
      tags.slice(0, 2).forEach((tag) => addEdge('tag:' + tag, recordId, 1))
    }

    ;(record.relatedIds || []).forEach((relatedId) => {
      if (recent.some((item) => item.id === relatedId)) addEdge('record:' + record.id, 'record:' + relatedId, 2)
    })
  })

  const ranked = [...nodes.values()].sort((a, b) => b.weight - a.weight).slice(0, 30)
  const allowed = new Set(ranked.map((node) => node.id))

  return {
    nodes: ranked,
    edges: [...edges.values()].filter((edge) => allowed.has(edge.from) && allowed.has(edge.to)).slice(0, 50),
  }
}

export function deriveDecisionPattern(records: StoredRecord[]) {
  const decisions = records.filter((record) => !record.private && record.type === 'Decisão' && record.outcome && record.outcome !== 'unknown')
  const scored = decisions.map((decision) => {
    const decisionTags = new Set(recordTags(decision))
    const decisionTime = new Date(decision.createdAt).getTime()
    const researched = records.some((candidate) => {
      if (candidate.private || candidate.type !== 'Pesquisa') return false
      const time = new Date(candidate.createdAt).getTime()
      if (time >= decisionTime || time < decisionTime - 90 * 86400000) return false
      if (candidate.area === decision.area) return true
      return recordTags(candidate).some((tag) => decisionTags.has(tag))
    })
    return { decision, researched, good: decision.outcome === 'good' }
  })

  const withResearch = scored.filter((item) => item.researched)
  const withoutResearch = scored.filter((item) => !item.researched)
  const rate = (items: typeof scored) => items.length ? Math.round(items.filter((item) => item.good).length / items.length * 100) : null
  const withRate = rate(withResearch)
  const withoutRate = rate(withoutResearch)

  let insight = 'Ainda não há decisões avaliadas o suficiente para reconhecer um padrão.'
  if (withRate != null && withoutRate != null && withResearch.length >= 2 && withoutResearch.length >= 2) {
    if (withRate > withoutRate + 15) insight = 'Até aqui, decisões precedidas por pesquisa têm saído melhor para você.'
    else if (withoutRate > withRate + 15) insight = 'Até aqui, pesquisar antes não foi o fator que mais diferenciou suas boas decisões.'
    else insight = 'Até aqui, pesquisar antes e decidir mais direto tiveram resultados parecidos.'
  } else if (scored.length >= 2) {
    insight = scored.filter((item) => item.good).length + '/' + scored.length + ' decisões avaliadas foram marcadas como boas escolhas.'
  }

  return {
    total: scored.length,
    withResearch: withResearch.length,
    withoutResearch: withoutResearch.length,
    withResearchGoodRate: withRate,
    withoutResearchGoodRate: withoutRate,
    insight,
  }
}

export function derivePlaces(records: StoredRecord[]) {
  const groups = new Map<string, StoredRecord[]>()
  records.filter((record) => !record.private && record.place).forEach((record) => {
    const key = record.place!.trim()
    const current = groups.get(key) || []
    current.push(record)
    groups.set(key, current)
  })

  return [...groups.entries()]
    .map(([place, items]) => ({
      place,
      count: items.length,
      latest: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
      records: items,
    }))
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt))
}

export function deriveObjects(records: StoredRecord[]) {
  return records
    .filter((record) => !record.private && !record.trashedAt && (record.objectName || record.area === 'Compras'))
    .map((record) => ({
      record,
      name: record.objectName || record.text.slice(0, 56),
      state: record.objectState || (record.journeyStage === 'Comprei' ? 'bought' : 'researching'),
    }))
    .sort((a, b) => b.record.updatedAt?.localeCompare(a.record.updatedAt || a.record.createdAt) || 0)
}

export function dueCapsules(records: StoredRecord[], now = new Date()) {
  return records
    .filter((record) => !record.trashedAt && record.revealAt && !record.capsuleOpenedAt)
    .filter((record) => new Date(record.revealAt as string).getTime() <= now.getTime())
    .sort((a, b) => String(a.revealAt).localeCompare(String(b.revealAt)))
}

export function futureCapsules(records: StoredRecord[]) {
  return records
    .filter((record) => !record.trashedAt && record.revealAt && !record.capsuleOpenedAt)
    .sort((a, b) => String(a.revealAt).localeCompare(String(b.revealAt)))
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] || char))
}

export function downloadEditorialHtml(title: string, subtitle: string, records: StoredRecord[], filename: string) {
  const body = records.map((record) => `
    <article>
      <div class="meta">${escapeHtml(record.type)} · ${escapeHtml(record.area)} · ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(record.createdAt))}</div>
      <h2>${escapeHtml(record.text || 'Registro com anexo')}</h2>
      ${record.whyItMatters ? '<p class="why">Por que importava: ' + escapeHtml(record.whyItMatters) + '</p>' : ''}
      ${record.outcome ? '<p class="outcome">Resultado: ' + escapeHtml(record.outcome) + '</p>' : ''}
    </article>
  `).join('')

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;background:#f6f2e9;color:#2e2b27;font-family:Arial,sans-serif}main{max-width:760px;margin:auto;padding:64px 28px 100px}
header{border-bottom:2px solid #3157c8;padding-bottom:40px;margin-bottom:42px}.kicker{font-size:11px;letter-spacing:.18em;color:#3157c8;font-weight:700}
h1{font-family:Georgia,serif;font-size:64px;line-height:.92;margin:18px 0}header p{max-width:560px;color:#6f6a62;line-height:1.5}
article{padding:28px 0;border-bottom:1px solid rgba(46,43,39,.14)}.meta{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#7656b5}
h2{font-family:Georgia,serif;font-size:30px;line-height:1.15;margin:14px 0}.why,.outcome{color:#6f6a62;line-height:1.5}
footer{margin-top:54px;font-size:10px;color:#817b72}@media print{body{background:#fff}main{padding-top:20px}}
</style></head><body><main><header><div class="kicker">EU · ARQUIVO VIVO</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>${body}<footer>Gerado pelo EU · ${new Date().toLocaleDateString('pt-BR')}</footer></main></body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.html') ? filename : filename + '.html'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
