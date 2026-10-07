import { NavLink } from 'react-router-dom'
import type { OneEuConnection } from './oneEu'
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
  const shown = items.slice(0, limit)
  if (!shown.length) return null

  return (
    <section className={'one-eu-connections-v42' + (compact ? ' is-compact' : '')} aria-label="Conexões entre áreas do EU">
      <header>
        <div><Tag tone="lilac">ONE EU</Tag><h2>{title}</h2></div>
        <NavLink to="/pergunte?q=O%20que%20est%C3%A1%20conectado%20na%20minha%20vida%20agora%3F">perguntar <EuIcon name="arrow-up-right" /></NavLink>
      </header>
      <div className="one-eu-list-v42">
        {shown.map((item) => (
          <NavLink key={item.id} to={item.route} className={'one-eu-card-v42 tone-' + item.tone}>
            <span className="one-eu-icon-v42"><EuIcon name={item.icon} /></span>
            <div>
              <small>{item.eyebrow}{item.areas.length ? ' · ' + item.areas.join(' + ') : ''}</small>
              <strong>{item.title}</strong>
              {!compact && <p>{item.detail}</p>}
              <em>{item.actionLabel} <EuIcon name="arrow-up-right" /></em>
            </div>
          </NavLink>
        ))}
      </div>
    </section>
  )
}
