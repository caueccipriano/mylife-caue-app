import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { enqueueChatBatch, removeChatBatch, type ChatInboxItem } from './chatInbox'
import { nextFollowUpDate, saveRecord } from './storage'
import { detectSensitiveContent } from './lifeModel'
import { haptic } from './securitySettings'
import { BrandTop, Tag, typeTone } from './v2Ui'

const areaOptions = ['Carreira', 'Dinheiro', 'Estudos', 'Casa', 'Viagens', 'Compras', 'Lazer', 'Pessoal']
const typeOptions = ['Memória', 'Preferência', 'Desejo', 'Pesquisa', 'Curso', 'Pendência', 'Objetivo', 'Projeto', 'Decisão', 'Insight', 'Ideia', 'Marco', 'Contexto', 'Conquista']

function parseIncoming(search: string): ChatInboxItem[] {
  const params = new URLSearchParams(search)
  const batch = params.get('itens')

  if (batch) {
    try {
      const parsed = JSON.parse(batch) as ChatInboxItem[]
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({
            text: item.text.trim(),
            type: item.type || 'Memória',
            area: item.area || 'Pessoal',
            track: Boolean(item.track),
            followUpDays: Number(item.followUpDays) > 0 ? Number(item.followUpDays) : undefined,
            private: Boolean(item.private),
            whyItMatters: item.whyItMatters?.trim() || undefined,
            source: item.source || 'chatgpt',
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
    type: params.get('tipo')?.trim() || 'Memória',
    area: params.get('area')?.trim() || 'Pessoal',
    track: params.get('acompanhar') === '1' || params.get('acompanhar') === 'true',
    followUpDays: followUpDays > 0 ? followUpDays : undefined,
    private: params.get('privado') === '1' || params.get('privado') === 'true',
    whyItMatters: params.get('porque')?.trim() || undefined,
    source: params.get('origem') === 'share' ? 'share' : 'chatgpt',
  }]
}

export default function ChatCapturePage() {
  const location = useLocation()
  const incoming = useMemo(() => parseIncoming(location.search), [location.search])
  const [items, setItems] = useState(() => incoming.map((item) => ({ ...item, keep: true })))
  const [batchId, setBatchId] = useState<string | null>(null)
  const [state, setState] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready')

  useEffect(() => {
    setItems(incoming.map((item) => ({ ...item, keep: true })))
    const batch = enqueueChatBatch(incoming)
    setBatchId(batch?.id ?? null)
  }, [incoming])

  const kept = items.filter((item) => item.keep)
  const summary = useMemo(() => {
    const counts = new Map<string, number>()
    items.filter((item) => item.keep).forEach((item) => {
      const type = item.type || 'Memória'
      counts.set(type, (counts.get(type) || 0) + 1)
    })
    const sensitiveCount = items.filter((item) => item.keep && detectSensitiveContent(item.text).length > 0).length
    return {
      counts: [...counts.entries()].sort((a, b) => b[1] - a[1]),
      sensitiveCount,
      tracked: items.filter((item) => item.keep && item.track).length,
    }
  }, [items])

  function patchItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  async function saveAll() {
    if (!kept.length || state === 'saving') return
    setState('saving')

    try {
      const now = new Date()
      for (const item of kept) {
        const days = item.followUpDays || (item.track ? 7 : undefined)
        await saveRecord({
          id: crypto.randomUUID(),
          text: item.text.trim(),
          type: item.type || 'Memória',
          area: item.area || 'Pessoal',
          source: item.source || 'chatgpt',
          createdAt: now.toISOString(),
          status: item.track ? 'active' : undefined,
          followUpDays: days,
          followUpAt: item.track && days ? nextFollowUpDate(days, now) : undefined,
          startedAt: item.track ? now.toISOString() : undefined,
          private: item.private,
          whyItMatters: item.whyItMatters?.trim() || undefined,
        })
      }

      if (batchId) removeChatBatch(batchId)
      window.dispatchEvent(new Event('eu-record-saved'))
      haptic('success')
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
        <p>{items.length ? 'Revise, edite ou desmarque qualquer coisa. O pacote fica na Caixa do Chat até você decidir.' : 'Este link não trouxe nenhum item válido.'}</p>
      </header>

      {items.length > 0 && (
        <section className="conversation-summary-card">
          <div className="conversation-summary-top">
            <Tag tone="cobalt">O QUE SAIU DAQUI</Tag>
            <span>{kept.length} {kept.length === 1 ? 'coisa' : 'coisas'}</span>
          </div>
          <div className="conversation-summary-chips">
            {summary.counts.slice(0, 5).map(([type, count]) => <span key={type}>{count} {type}</span>)}
            {summary.tracked > 0 && <span>{summary.tracked} em acompanhamento</span>}
          </div>
          {summary.sensitiveCount > 0 && (
            <div className="conversation-security-note">
              <Tag tone="wine">REVISAR PRIVACIDADE</Tag>
              <p>{summary.sensitiveCount} {summary.sensitiveCount === 1 ? 'item parece conter informação pessoal/sensível.' : 'itens parecem conter informação pessoal/sensível.'} Nada entra sem sua confirmação.</p>
            </div>
          )}
        </section>
      )}

      {items.length > 0 && (
        <div className="chat-incoming-list editable-inbox-list">
          {items.map((item, index) => (
            <article key={index} className={!item.keep ? 'discarded' : ''}>
              <div className="chat-item-toolbar">
                <label className="keep-toggle">
                  <input type="checkbox" checked={item.keep} onChange={(event) => patchItem(index, { keep: event.target.checked })} />
                  <span>{item.keep ? 'guardar' : 'ignorar'}</span>
                </label>
                <Tag tone={typeTone(item.type || 'Memória')}>{item.type || 'Memória'}</Tag>
              </div>

              <textarea value={item.text} onChange={(event) => patchItem(index, { text: event.target.value })} rows={3} />

              <div className="chat-item-fields">
                <select value={item.type || 'Memória'} onChange={(event) => patchItem(index, { type: event.target.value })}>
                  {typeOptions.map((value) => <option key={value}>{value}</option>)}
                </select>
                <select value={item.area || 'Pessoal'} onChange={(event) => patchItem(index, { area: event.target.value })}>
                  {areaOptions.map((value) => <option key={value}>{value}</option>)}
                </select>
              </div>

              <div className="chat-track-row">
                <label>
                  <input type="checkbox" checked={Boolean(item.track)} onChange={(event) => patchItem(index, { track: event.target.checked })} />
                  acompanhar
                </label>
                {item.track && (
                  <label>
                    voltar em
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={item.followUpDays || 7}
                      onChange={(event) => patchItem(index, { followUpDays: Math.max(1, Number(event.target.value) || 7) })}
                    />
                    dias
                  </label>
                )}
              </div>

              {detectSensitiveContent(item.text).length > 0 && (
                <div className="chat-sensitive-row">
                  <Tag tone="wine">PESSOAL</Tag>
                  <span>{detectSensitiveContent(item.text).map((hint) => hint.label).join(' · ')}</span>
                  <label>
                    <input type="checkbox" checked={Boolean(item.private)} onChange={(event) => patchItem(index, { private: event.target.checked })} />
                    Privado
                  </label>
                </div>
              )}

              {(item.track || item.type === 'Decisão' || item.type === 'Objetivo') && (
                <input
                  className="chat-why-input"
                  value={item.whyItMatters || ''}
                  onChange={(event) => patchItem(index, { whyItMatters: event.target.value })}
                  placeholder="Por que isso importa? (opcional)"
                />
              )}
            </article>
          ))}
        </div>
      )}

      {state === 'saved' ? (
        <section className="chat-capture-success">
          <span>✓</span>
          <h2>Entrou no EU.</h2>
          <p>{kept.length === 1 ? 'Esse registro agora faz parte da sua história.' : kept.length + ' registros entraram juntos, já organizados.'}</p>
          <div>
            <NavLink to="/">Voltar para Hoje</NavLink>
            <NavLink to="/memorias?origem=chatgpt">Ver em Memórias</NavLink>
          </div>
        </section>
      ) : items.length > 0 ? (
        <div className="chat-capture-actions">
          <button onClick={saveAll} disabled={state === 'saving' || !kept.length}>
            {state === 'saving' ? 'Guardando…' : kept.length > 1 ? 'Guardar ' + kept.length + ' coisas no EU' : 'Guardar no EU'}
          </button>
          <NavLink to="/inbox">Deixar na Caixa do Chat</NavLink>
          {state === 'error' && <p>Não consegui salvar neste aparelho. Tente novamente.</p>}
        </div>
      ) : (
        <NavLink className="back-v2" to="/">← Voltar para Hoje</NavLink>
      )}
    </div>
  )
}
