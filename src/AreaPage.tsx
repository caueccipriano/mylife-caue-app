import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { areas } from './data'
import { useRecords } from './appState'
import { isRecordVisibleForInsights } from './storage'
import { getFocusAreas, setFocusAreas } from './uxFeatures'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone, type EuIconName } from './v2Ui'

const areaIcons: Record<string, EuIconName> = {
  carreira: 'briefcase',
  dinheiro: 'wallet',
  estudos: 'book',
  casa: 'home',
  viagens: 'plane',
  compras: 'bag',
  lazer: 'sparkles',
  pessoal: 'user',
}

export default function AreaPage() {
  const { id } = useParams()
  const definition = areas.find((area) => area.id === id)
  const records = useRecords()
  const [focus, setFocus] = useState(() => getFocusAreas())

  if (!definition) {
    return (
      <div className="v2-page area-page">
        <BrandTop />
        <NavLink className="back-v2" to="/vida">← Vida</NavLink>
        <div className="soft-empty wide"><span>?</span><p>Essa área não existe.</p></div>
      </div>
    )
  }

  const areaName = definition.name
  const items = records.filter((record) => isRecordVisibleForInsights(record) && record.area === areaName)
  const active = items.filter((record) => record.status === 'active')
  const decisions = items.filter((record) => record.type === 'Decisão')
  const wants = items.filter((record) => ['Desejo','Pesquisa','Preferência'].includes(record.type))
  const completed = items.filter((record) => record.status === 'completed')
  const inFocus = focus.includes(areaName)

  function toggleFocus() {
    const next = inFocus
      ? focus.filter((area) => area !== areaName)
      : [...focus, areaName].slice(-3)
    setFocus(setFocusAreas(next))
  }

  return (
    <div className={'v2-page area-page area-page-' + definition.id}>
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="v2-hero area-hero">
        <div className="area-hero-top">
          <span className="area-hero-icon"><EuIcon name={areaIcons[definition.id] || 'sparkles'} /></span>
          <Tag tone={definition.id === 'carreira' ? 'green' : definition.id === 'dinheiro' ? 'cobalt' : definition.id === 'estudos' ? 'lilac' : definition.id === 'viagens' ? 'sky' : definition.id === 'compras' ? 'amber' : 'muted'}>{definition.name}</Tag>
        </div>
        <h1>{definition.name}</h1>
        <p>{definition.direction}</p>
        <button className={'area-focus-toggle' + (inFocus ? ' active' : '')} onClick={toggleFocus}>{inFocus ? '✓ no foco do momento' : '＋ colocar no foco'}</button>
      </header>

      <section className="area-stats-row">
        <article><strong>{active.length}</strong><span>em movimento</span></article>
        <article><strong>{decisions.length}</strong><span>decisões</span></article>
        <article><strong>{completed.length}</strong><span>concluídos</span></article>
      </section>

      <section className="area-section">
        <SectionTitle eyebrow="AGORA" title="O que está vivo aqui" />
        <div className="area-record-grid">
          {active.slice(0, 8).map((record) => (
            <NavLink key={record.id} to={'/registro/' + record.id}>
              <div><Tag tone={typeTone(record.type)}>{record.type}</Tag>{record.pinned && <Tag tone="cobalt">FIXADO</Tag>}</div>
              <h3>{record.text}</h3>
              <p>{record.nextMove || 'desde ' + formatShortDate(record.startedAt || record.createdAt)}</p>
            </NavLink>
          ))}
          {!active.length && <div className="soft-empty wide"><span><EuIcon name="check" /></span><p>Nada ativo nesta área agora.</p></div>}
        </div>
      </section>

      {wants.length > 0 && (
        <details className="area-section area-fold" open>
          <summary>
            <div><span>QUERO / PESQUISANDO</span><strong>Coisas em consideração</strong></div>
            <b>{wants.length}</b>
          </summary>
          <div className="compact-stack">
            {wants.slice(0, 8).map((record) => (
              <NavLink key={record.id} className="compact-record-link" to={'/registro/' + record.id}><Tag tone="amber">{record.type}</Tag><p>{record.text}</p></NavLink>
            ))}
          </div>
        </details>
      )}

      {decisions.length > 0 && (
        <details className="area-section area-fold">
          <summary>
            <div><span>DECISÕES</span><strong>Escolhas que moldaram esta área</strong></div>
            <b>{decisions.length}</b>
          </summary>
          <div className="compact-stack">
            {decisions.slice(0, 8).map((record) => (
              <NavLink key={record.id} className="compact-record-link" to={'/registro/' + record.id}><Tag tone="green">DECISÃO</Tag><p>{record.text}</p></NavLink>
            ))}
          </div>
        </details>
      )}

      <section className="area-section">
        <SectionTitle eyebrow="HISTÓRICO" title="Registros recentes" />
        <div className="area-history-list">
          {items.slice(0, 14).map((record) => (
            <NavLink key={record.id} to={'/registro/' + record.id}>
              <span>{formatShortDate(record.createdAt)}</span>
              <strong>{record.type}</strong>
              <p>{record.text}</p>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  )
}
