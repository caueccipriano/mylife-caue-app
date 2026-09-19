import type { BridgeCard } from './integrations'
import { smartSearch } from './intelligence'
import type { StoredRecord } from './storage'

export type EuAnswer = {
  answer: string
  sources: StoredRecord[]
  note?: string
}

function lower(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function short(value: string, max = 180) {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + '…' : value
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

export function answerFromEu(records: StoredRecord[], bridges: BridgeCard[], question: string): EuAnswer {
  const publicRecords = records.filter((record) => !record.private)
  const query = question.trim()
  const normalized = lower(query)

  if (!query) return { answer: 'Me pergunta qualquer coisa que você já tenha guardado no EU.', sources: [] }

  const matches = smartSearch(publicRecords, query).slice(0, 8)
  const decisions = matches.filter((record) => record.type === 'Decisão')
  const preferences = matches.filter((record) => ['Preferência', 'Desejo', 'Pesquisa'].includes(record.type))
  const active = matches.filter((record) => record.status === 'active')

  if (normalized.includes('como estou') || normalized.includes('como ta') || normalized.includes('como está')) {
    const bridgeBits = bridges
      .filter((card) => card.bridge?.summary)
      .map((card) => card.title + ': ' + card.bridge?.summary)
      .slice(0, 3)

    const recordBit = active.length
      ? active.length + (active.length === 1 ? ' coisa relacionada segue em andamento.' : ' coisas relacionadas seguem em andamento.')
      : 'Não encontrei nada relacionado em acompanhamento.'

    return {
      answer: [recordBit, ...bridgeBits].join(' '),
      sources: matches.slice(0, 4),
      note: bridgeBits.length ? 'Também considerei os sinais recentes dos apps integrados.' : undefined,
    }
  }

  if ((normalized.startsWith('quando') || normalized.includes(' quando ')) && matches.length) {
    const ordered = [...matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const first = ordered[0]
    return {
      answer: 'O primeiro registro que encontrei sobre isso é de ' + dateLabel(first.createdAt) + ': “' + short(first.text, 150) + '”',
      sources: ordered.slice(0, 5),
    }
  }

  if (normalized.includes('decid') && decisions.length) {
    return {
      answer: decisions.length === 1
        ? 'Encontrei uma decisão ligada a isso: “' + short(decisions[0].text, 180) + '”'
        : 'Encontrei ' + decisions.length + ' decisões ligadas a isso. A mais recente foi: “' + short(decisions[0].text, 180) + '”',
      sources: decisions.slice(0, 6),
    }
  }

  if ((normalized.includes('gost') || normalized.includes('pref') || normalized.includes('queria')) && preferences.length) {
    const latest = preferences[0]
    return {
      answer: 'A referência mais recente que encontrei sobre seu gosto é: “' + short(latest.text, 180) + '”',
      sources: preferences.slice(0, 6),
      note: preferences.length > 1 ? 'Há outras referências antigas abaixo para você comparar como isso evoluiu.' : undefined,
    }
  }

  if (matches.length === 1) {
    return {
      answer: 'Encontrei isso no seu EU: “' + short(matches[0].text, 220) + '”',
      sources: matches,
    }
  }

  if (matches.length > 1) {
    const areas = [...new Set(matches.map((record) => record.area))].slice(0, 3)
    return {
      answer: 'Encontrei ' + matches.length + ' registros relacionados' + (areas.length ? ' em ' + areas.join(', ') : '') + '. O mais relevante agora é: “' + short(matches[0].text, 180) + '”',
      sources: matches.slice(0, 6),
      note: 'A resposta é montada localmente a partir do seu próprio arquivo; toque nas fontes para conferir o contexto.',
    }
  }

  return {
    answer: 'Ainda não encontrei nada no seu arquivo que responda bem a isso. Talvez esse seja um bom assunto para registrar quando aparecer.',
    sources: [],
  }
}
