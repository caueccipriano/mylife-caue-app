import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { OneEuConnection } from './oneEu'
import { createActionFromConnection } from './oneEuActions'
import { surfaceAffinity, trackSurfaceEngaged, trackSurfaceSeen } from './personalization'
import { haptic } from './securitySettings'
import { EuIcon, Tag } from './v2Ui'

export default function OneEuConnections({
  items,
  limit = 2,
  title = 'O EU conectou.',
  compact = false,
}: {
  items: OneEuConnection[]
  limit?: number
  title?: string
  compact?: boolean
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const shown = useMemo(
    () => [...items]
      .sort((a, b) => (b.priority + surfaceAffinity(b.id)) - (a.priority + surfaceAffinity(a.id)))
      .slice(0, limit),
    [items, limit],
  )

  useEffect(() => {
    shown.forEach((item) => trackSurfaceSeen(item.id))
  }, [shown.map((item) => item.id).join('|')])

  if (!shown.length) return null

  async function turnIntoAction(item: OneEuConnection) {
    if (!window.confirm('Transformar essa conexão em um próximo passo acompanhado pelo EU?')) return
    setBusyId(item.id)
    try {
      await createActionFromConnection(item)
      trackSurfaceEngaged(item.id)
      haptic('success')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className={'one-eu-connections-v42' + (compact ? ' is-compact' : '')} aria-label="Conexões entre áreas do EU">
      <header>
        <div><Tag tone="lilac">ONE EU</Tag><h2>{title}</h2></div>
        <NavLink to="/pergunte?q=O%20que%20est%C3%A1%20conectado%20na%20minha%20vida%20agora%3F">perguntar <EuIcon name="arrow-up-right" /></NavLink>
      </header>
      <div className="one-eu-list-v42">
        {shown.map((item) => (
          <article key={item.id} className={'one-eu-card-v42 tone-' + item.tone}>
            <NavLink className="one-eu-card-main-v54" to={item.route} onClick={() => trackSurfaceEngaged(item.id)}>
              <span className="one-eu-icon-v42"><EuIcon name={item.icon} /></span>
              <div>
                <small>{item.eyebrow}{item.areas.length ? ' · ' + item.areas.join(' + ') : ''}</small>
                <strong>{item.title}</strong>
                {!compact && <p>{item.detail}</p>}
                <em>{item.actionLabel} <EuIcon name="arrow-up-right" /></em>
              </div>
            </NavLink>
            <button className="one-eu-make-action-v54" onClick={() => void turnIntoAction(item)} disabled={busyId === item.id}>
              <EuIcon name="plus" />{busyId === item.id ? 'criando…' : compact ? 'acompanhar' : 'virar próximo passo'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
