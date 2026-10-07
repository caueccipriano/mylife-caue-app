import { NavLink } from 'react-router-dom'
import type { MemoryInsight } from './memoryIntelligence'
import { EuIcon, Tag } from './v2Ui'

export default function MemoryInsights({ items }: { items: MemoryInsight[] }) {
  if (!items.length) return null
  return (
    <section className="memory-intelligence-v49">
      <header><div><Tag tone="pink">O EU PERCEBEU</Tag><h2>Padrões que aparecem com o tempo.</h2></div></header>
      <div>
        {items.slice(0, 3).map((item) => (
          <NavLink key={item.id} to={item.route}>
            <span><EuIcon name={item.icon} /></span>
            <div><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{item.detail}</p></div>
            <EuIcon name="arrow-up-right" />
          </NavLink>
        ))}
      </div>
    </section>
  )
}
