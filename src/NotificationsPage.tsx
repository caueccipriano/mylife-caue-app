import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  deleteEuNotification,
  listEuNotifications,
  markAllEuNotificationsRead,
  markEuNotificationRead,
  type EuNotification,
} from './notifications'
import { BrandTop, Tag } from './v2Ui'

function categoryLabel(category: EuNotification['category']) {
  if (category === 'humor') return 'Humor'
  if (category === 'followup') return 'Voltou pra você'
  if (category === 'decision') return 'Decisão'
  if (category === 'capsule') return 'Cápsula'
  if (category === 'weekly') return 'Semana'
  if (category === 'monthly') return 'Mês'
  if (category === 'ecosystem') return 'Apps'
  return 'Insight'
}

function tone(category: EuNotification['category']) {
  if (category === 'humor') return 'sky' as const
  if (category === 'followup') return 'amber' as const
  if (category === 'decision') return 'green' as const
  if (category === 'capsule') return 'lilac' as const
  if (category === 'weekly') return 'cobalt' as const
  if (category === 'monthly') return 'pink' as const
  if (category === 'ecosystem') return 'green' as const
  return 'lilac' as const
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(() => listEuNotifications())

  useEffect(() => {
    const refresh = () => setItems(listEuNotifications())
    window.addEventListener('eu-notifications-updated', refresh)
    return () => window.removeEventListener('eu-notifications-updated', refresh)
  }, [])

  const unread = items.filter((item) => !item.readAt).length

  function open(item: EuNotification) {
    markEuNotificationRead(item.id)
    if (item.actionUrl) navigate(item.actionUrl)
  }

  return (
    <div className="v2-page notifications-page">
      <BrandTop />
      <NavLink className="back-v2" to="/">← Hoje</NavLink>

      <header className="v2-hero notifications-hero">
        <Tag tone="cobalt">CENTRAL</Tag>
        <h1>O EU te chama<br />só quando vale.</h1>
        <p>Lembretes, coisas que voltaram, cápsulas e resumos — tudo fica aqui mesmo se você dispensar um aviso.</p>
      </header>

      <div className="notification-toolbar">
        <div>
          <strong>{unread}</strong>
          <span>não lida{unread === 1 ? '' : 's'}</span>
        </div>
        {unread > 0 && <button onClick={() => markAllEuNotificationsRead()}>marcar tudo como lido</button>}
      </div>

      <div className="notification-list">
        {items.map((item) => (
          <article key={item.id} className={'notification-card' + (!item.readAt ? ' unread' : '')}>
            <button className="notification-open" onClick={() => open(item)}>
              <div className="notification-card-head">
                <Tag tone={tone(item.category)}>{categoryLabel(item.category)}</Tag>
                {!item.readAt && <i aria-label="não lida" />}
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <small>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}</small>
            </button>
            <button className="notification-delete" aria-label="Apagar notificação" onClick={() => deleteEuNotification(item.id)}>×</button>
          </article>
        ))}

        {!items.length && (
          <div className="soft-empty wide">
            <span>◌</span>
            <p>Nada te chamando agora. Quando algo realmente merecer voltar, aparece aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
