import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export type Accent = 'coral' | 'green' | 'amber' | 'pink' | 'ink' | 'muted'

export function Tag({ children, tone = 'ink' }: { children: ReactNode; tone?: Accent }) {
  return <span className={'v2-tag tag-' + tone}>{children}</span>
}

export function BrandTop() {
  return (
    <header className="v2-topbar">
      <NavLink to="/" className="v2-brand" aria-label="EU, Hoje">
        <strong>EU</strong>
        <span>arquivo vivo</span>
      </NavLink>
      <span className="v2-top-note">mais vida, menos ruído</span>
    </header>
  )
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="v2-section-title">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value))
}

export function typeTone(type: string): Accent {
  const value = type.toLowerCase()
  if (value.includes('carreira') || value.includes('curso') || value.includes('marco') || value.includes('conquista')) return 'green'
  if (value.includes('desejo') || value.includes('prefer') || value.includes('gostei')) return 'pink'
  if (value.includes('insight') || value.includes('ideia') || value.includes('descoberta')) return 'amber'
  if (value.includes('pend') || value.includes('objetivo') || value.includes('projeto')) return 'coral'
  return 'muted'
}
