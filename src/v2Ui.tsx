import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { RecordSource } from './storage'
import { unreadEuNotifications } from './notifications'

export type Accent = 'coral' | 'green' | 'amber' | 'pink' | 'cobalt' | 'lilac' | 'lime' | 'wine' | 'sky' | 'ink' | 'muted'

export type EuIconName =
  | 'smile' | 'neutral' | 'moon' | 'bolt'
  | 'heart' | 'arrow-up-right' | 'note'
  | 'search' | 'collections' | 'mood' | 'settings'
  | 'briefcase' | 'wallet' | 'book' | 'home'
  | 'plane' | 'bag' | 'sparkles' | 'user'

export function EuIcon({ name, className = 'eu-icon' }: { name: EuIconName; className?: string }) {
  let body: ReactNode

  switch (name) {
    case 'smile':
      body = <><circle cx="12" cy="12" r="8.2" /><path d="M8.7 10.1h.01M15.3 10.1h.01M8.8 13.6c.9 1.3 2 2 3.2 2s2.3-.7 3.2-2" /></>
      break
    case 'neutral':
      body = <><circle cx="12" cy="12" r="8.2" /><path d="M8.7 10.1h.01M15.3 10.1h.01M9.1 14.3h5.8" /></>
      break
    case 'moon':
      body = <path d="M16.9 15.6A7.3 7.3 0 0 1 8.4 7.1a7.3 7.3 0 1 0 8.5 8.5Z" />
      break
    case 'bolt':
      body = <path d="M13.2 2.8 6.8 13h4.3l-.3 8.2L17.2 11h-4.3l.3-8.2Z" />
      break
    case 'heart':
      body = <path d="M12 20s-7.2-4.5-8.5-9.1C2.5 7.9 4.3 5.3 7.2 5.3c1.9 0 3.2 1 4.8 2.8 1.6-1.8 2.9-2.8 4.8-2.8 2.9 0 4.7 2.6 3.7 5.6C19.2 15.5 12 20 12 20Z" />
      break
    case 'arrow-up-right':
      body = <><path d="M7 17 17 7" /><path d="M9 7h8v8" /></>
      break
    case 'note':
      body = <><path d="M7 4.5h7l3 3V19.5H7Z" /><path d="M14 4.5v3h3M9.5 11h5M9.5 14h5" /></>
      break
    case 'search':
      body = <><circle cx="10.7" cy="10.7" r="6.2" /><path d="m15.4 15.4 5 5" /></>
      break
    case 'collections':
      body = <><rect x="4" y="4" width="6" height="6" rx="1.4" /><rect x="14" y="4" width="6" height="6" rx="1.4" /><rect x="4" y="14" width="6" height="6" rx="1.4" /><rect x="14" y="14" width="6" height="6" rx="1.4" /></>
      break
    case 'mood':
      body = <><circle cx="12" cy="12" r="8.2" /><path d="M8.8 10h.01M15.2 10h.01M9 14c.9 1.1 1.9 1.7 3 1.7s2.1-.6 3-1.7" /></>
      break
    case 'settings':
      body = <><circle cx="12" cy="12" r="2.7" /><path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4" /></>
      break
    case 'briefcase':
      body = <><rect x="3.5" y="7.5" width="17" height="11.5" rx="2.3" /><path d="M9 7.5V5.7c0-.9.7-1.7 1.7-1.7h2.6c1 0 1.7.8 1.7 1.7v1.8M3.8 12.5h16.4M10.2 12.5v1.7h3.6v-1.7" /></>
      break
    case 'wallet':
      body = <><path d="M4 6.5h13.8c1.2 0 2.2 1 2.2 2.2v8.8c0 1.2-1 2.2-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.5Z" /><path d="M4 8V6.8c0-1.1.7-2 1.8-2.3L16 2.8v3.7M15.6 11.2h4.3v4h-4.3a2 2 0 0 1 0-4Z" /></>
      break
    case 'book':
      body = <><path d="M4.3 5.3c2.8-.8 5.3-.4 7.7 1.2v13c-2.4-1.6-4.9-2-7.7-1.2Z" /><path d="M19.7 5.3c-2.8-.8-5.3-.4-7.7 1.2v13c2.4-1.6 4.9-2 7.7-1.2Z" /></>
      break
    case 'home':
      body = <><path d="m3.8 10.7 8.2-7 8.2 7" /><path d="M6.2 9.1v10.1h11.6V9.1M10 19.2v-5.8h4v5.8" /></>
      break
    case 'plane':
      body = <path d="m3.3 13.1 7.1-2.2 4.7-7.4c.4-.7 1.3-.9 1.9-.4.6.4.7 1.2.3 1.8l-3.7 6.4 6.4 2c.8.2 1.2 1 .9 1.7-.2.7-.9 1.1-1.6.9l-6.8-1.2-3.5 5.8-1.8-.6 1.7-5.9-4.9.7Z" />
      break
    case 'bag':
      body = <><path d="M5.2 8.3h13.6l-1 11H6.2Z" /><path d="M8.7 8.3V6.6a3.3 3.3 0 0 1 6.6 0v1.7" /></>
      break
    case 'sparkles':
      body = <><path d="M11.2 3.2c.6 4 2.7 6.1 6.7 6.7-4 .6-6.1 2.7-6.7 6.7-.6-4-2.7-6.1-6.7-6.7 4-.6 6.1-2.7 6.7-6.7Z" /><path d="M18 15.3c.3 1.8 1.3 2.8 3.1 3.1-1.8.3-2.8 1.3-3.1 3.1-.3-1.8-1.3-2.8-3.1-3.1 1.8-.3 2.8-1.3 3.1-3.1Z" /></>
      break
    case 'user':
      body = <><circle cx="12" cy="8.2" r="3.4" /><path d="M5.3 20c.7-4 3-6 6.7-6s6 2 6.7 6" /></>
      break
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {body}
    </svg>
  )
}

export function Tag({ children, tone = 'ink' }: { children: ReactNode; tone?: Accent }) {
  return <span className={'v2-tag tag-' + tone}>{children}</span>
}

export function BrandTop() {
  const [unread, setUnread] = useState(() => unreadEuNotifications().length)

  useEffect(() => {
    const refresh = () => setUnread(unreadEuNotifications().length)
    window.addEventListener('eu-notifications-updated', refresh)
    return () => window.removeEventListener('eu-notifications-updated', refresh)
  }, [])

  return (
    <header className="v2-topbar">
      <NavLink to="/" className="v2-brand" aria-label="EU, Hoje">
        <strong>EU</strong>
        <span>arquivo vivo</span>
      </NavLink>
      <div className="v2-top-actions">
        <span className="v2-top-note">mais vida, menos ruído</span>
        <NavLink to="/notificacoes" className="notification-bell" aria-label={unread ? unread + ' notificações não lidas' : 'Notificações'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.8 9.7a5.2 5.2 0 0 1 10.4 0c0 5.8 2.2 6.4 2.2 6.4H4.6s2.2-.6 2.2-6.4Z" />
            <path d="M9.8 19.1a2.4 2.4 0 0 0 4.4 0" />
          </svg>
          {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
        </NavLink>
      </div>
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
  if (value.includes('carreira') || value.includes('conquista')) return 'green'
  if (value.includes('curso') || value.includes('estudo')) return 'lime'
  if (value.includes('desejo') || value.includes('prefer') || value.includes('gostei')) return 'pink'
  if (value.includes('insight') || value.includes('ideia') || value.includes('descoberta')) return 'amber'
  if (value.includes('decisão') || value.includes('decisao')) return 'wine'
  if (value.includes('memória') || value.includes('memoria') || value.includes('referência') || value.includes('referencia')) return 'cobalt'
  if (value.includes('depois') || value.includes('futuro') || value.includes('cápsula') || value.includes('capsula')) return 'lilac'
  if (value.includes('objeto')) return 'pink'
  if (value.includes('lugar')) return 'sky'
  if (value.includes('marco')) return 'sky'
  if (value.includes('pend') || value.includes('objetivo') || value.includes('projeto')) return 'coral'
  return 'muted'
}

export function sourceLabel(source?: RecordSource) {
  if (source === 'chatgpt') return 'Do Chat'
  if (source === 'share') return 'Compartilhado'
  if (source === 'folego') return 'Fôlego'
  if (source === 'traco') return 'Traço'
  if (source === 'repertorio') return 'Repertório'
  if (source === 'import') return 'Importado'
  return 'Você'
}

export function sourceTone(source?: RecordSource): Accent {
  if (source === 'chatgpt') return 'ink'
  if (source === 'share') return 'cobalt'
  if (source === 'folego') return 'green'
  if (source === 'traco') return 'coral'
  if (source === 'repertorio') return 'amber'
  if (source === 'import') return 'muted'
  return 'sky'
}
