import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { nextFollowUpDate, saveRecord } from './storage'
import { BrandTop, Tag, typeTone } from './v2Ui'

type IncomingItem = {
  text: string
  type?: string
  area?: string
  track?: boolean
  followUpDays?: number
}

function parseIncoming(search: string): IncomingItem[] {
  const params = new URLSearchParams(search)
  const batch = params.get('itens')

  if (batch) {
    try {
      const parsed = JSON.parse(batch) as IncomingItem[]
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({
            text: item.text.trim(),
            type: item.type || 'Nota',
            area: item.area || 'Pessoal',
            track: Boolean(item.track),
            followUpDays: Number(item.followUpDays) > 0 ? Number(item.followUpDays) : undefined,
          }))
      }
    } catch {
      // cai para captura unitária
    }
  }

  const text = params.get('texto')?.trim()
  if (!text) return []

  const followUpDays = Number(params.get('dias'))
  return [{
    text,
    type: params.get('tipo')?.trim() || 'Nota',
    area: params.get('area')?.trim() || 'Pessoal',
    track: params.get('acompanhar') === '1' || params.get('acompanhar') === 'true',
    followUpDays: followUpDays > 0 ? followUpDays : undefined,
  }]
}

export default function ChatCapturePage() {
  const location = useLocation()
  const items = useMemo(() => parseIncoming(location.search), [location.search])
  const [state, setState] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready')

  async function saveAll() {
    if (!items.length || state === 'saving') return
    setState('saving')

    try {
      const now = new Date()
      for (const item of items) {
        const days = item.followUpDays || (item.track ? 7 : undefined)
        await saveRecord({
          id: crypto.randomUUID(),
          text: item.text,
          type: item.type || 'Nota',
          area: item.area || 'Pessoal',
          source: 'chatgpt',
          createdAt: now.toISOString(),
          status: item.track ? 'active' : undefined,
          followUpDays: days,
          followUpAt: item.track && days ? nextFollowUpDate(days, now) : undefined,
          startedAt: item.track ? now.toISOString() : undefined,
        })
      }

      window.dispatchEvent(new Event('eu-record-saved'))
      setState('saved')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="v2-page chat-capture-page">
      <BrandTop />

      <header className="v2-hero chat-capture-hero">
        <Tag tone="ink">CHATGPT → EU</Tag>
        <h1>{items.length > 1 ? 'Fechamos a conversa.' : 'Isso merece ficar.'}</h1>
        <p>{items.length ? 'Confira o que vai entrar no seu EU. Nada é salvo sem você confirmar.' : 'Este link não trouxe nenhum item válido.'}</p>
      </header>

      {items.length > 0 && (
        <div className="chat-incoming-list">
          {items.map((item, index) => (
            <article key={index}>
              <div className="feed-meta">
                <Tag tone={typeTone(item.type || 'Nota')}>{item.type || 'Nota'}</Tag>
                <span>{item.area || 'Pessoal'}</span>
                {item.track && <Tag tone="coral">acompanhar</Tag>}
              </div>
              <h3>{item.text}</h3>
              {item.track && <p>↻ O EU volta nisso em {item.followUpDays || 7} dias.</p>}
            </article>
          ))}
        </div>
      )}

      {state === 'saved' ? (
        <section className="chat-capture-success">
          <span>✓</span>
          <h2>Entrou no EU.</h2>
          <p>{items.length === 1 ? 'Esse registro agora faz parte da sua história.' : items.length + ' registros entraram juntos, já organizados.'}</p>
          <div>
            <NavLink to="/">Voltar para Hoje</NavLink>
            <NavLink to="/memorias?origem=chatgpt">Ver em Memórias</NavLink>
          </div>
        </section>
      ) : items.length > 0 ? (
        <div className="chat-capture-actions">
          <button onClick={saveAll} disabled={state === 'saving'}>{state === 'saving' ? 'Guardando…' : items.length > 1 ? 'Guardar tudo no EU' : 'Guardar no EU'}</button>
          <NavLink to="/">Agora não</NavLink>
          {state === 'error' && <p>Não consegui salvar neste aparelho. Tente novamente.</p>}
        </div>
      ) : (
        <NavLink className="back-v2" to="/">← Voltar para Hoje</NavLink>
      )}
    </div>
  )
}
