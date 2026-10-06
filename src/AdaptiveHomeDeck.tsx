import { NavLink } from 'react-router-dom'
import type { AdaptiveHomeItem } from './adaptiveLife'
import { EuIcon, Tag, type EuIconName } from './v2Ui'

const iconById: Record<AdaptiveHomeItem['id'], EuIconName> = {
  action: 'bolt',
  money: 'wallet',
  goal: 'compass',
  project: 'collections',
  people: 'user',
  inbox: 'inbox',
}

export default function AdaptiveHomeDeck({ items }: { items: AdaptiveHomeItem[] }) {
  const primary = items[0]
  const secondary = items.slice(1)

  if (!primary) return null

  return (
    <section className={'adaptive-home-deck adaptive-primary-' + primary.id} aria-label="Prioridades adaptativas do EU">
      <div className="adaptive-home-head">
        <div>
          <small>PRIORIDADE</small>
          <h2>O que importa agora</h2>
        </div>
        <span>ajusta ao seu dia</span>
      </div>

      <NavLink to={primary.route} className={'adaptive-feature-card tone-' + primary.tone}>
        <div className="adaptive-feature-icon"><EuIcon name={iconById[primary.id]} /></div>
        <div className="adaptive-feature-copy">
          <Tag tone={primary.tone}>{primary.eyebrow}</Tag>
          <h3>{primary.title}</h3>
          <p>{primary.detail}</p>
          <small>ver agora <EuIcon name="arrow-up-right" /></small>
        </div>
        <strong className="adaptive-rank">01</strong>
      </NavLink>

      {secondary.length > 0 && (
        <div className="adaptive-secondary-grid">
          {secondary.map((item, index) => (
            <NavLink key={item.id} to={item.route} className={'adaptive-secondary-card tone-' + item.tone}>
              <span className="adaptive-secondary-icon"><EuIcon name={iconById[item.id]} /></span>
              <div>
                <small>{item.eyebrow}</small>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <b>0{index + 2}</b>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  )
}
