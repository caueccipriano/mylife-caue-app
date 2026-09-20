import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  deleteEuNotification,
  listEuNotifications,
  markAllEuNotificationsRead,
  markEuNotificationRead,
  type EuNotification,
} from './notifications'
import { nextFollowUpDate, saveMoodCheckin, updateRecord, type MoodValue } from './storage'
import { BrandTop, EuIcon, Tag } from './v2Ui'

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

function notificationPeriod(value: string) {
  const date = new Date(value)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = date.getTime()
  if (time >= startToday) return 'Hoje'
  if (time >= startToday - 6 * 86400000) return 'Esta semana'
  return 'Anteriores'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(() => listEuNotifications())
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setItems(listEuNotifications())
    window.addEventListener('eu-notifications-updated', refresh)
    return () => window.removeEventListener('eu-notifications-updated', refresh)
  }, [])

  const unread = items.filter((item) => !item.readAt).length
  const groups = ['Hoje', 'Esta semana', 'Anteriores']
    .map((label) => ({ label, items: items.filter((item) => notificationPeriod(item.createdAt) === label) }))
    .filter((group) => group.items.length > 0)

  function open(item: EuNotification) {
    markEuNotificationRead(item.id)
    if (item.actionUrl) navigate(item.actionUrl)
  }

  async function completeFollowup(item: EuNotification) {
    if (!item.sourceId || busyId) return
    setBusyId(item.id)
    try {
      await updateRecord(item.sourceId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        followUpAt: undefined,
      })
      deleteEuNotification(item.id)
      window.dispatchEvent(new Event('eu-record-saved'))
    } finally {
      setBusyId(null)
    }
  }

  async function snoozeFollowup(item: EuNotification) {
    if (!item.sourceId || busyId) return
    setBusyId(item.id)
    try {
      await updateRecord(item.sourceId, {
        status: 'active',
        followUpDays: 7,
        followUpAt: nextFollowUpDate(7),
        lastPromptedAt: new Date().toISOString(),
      })
      deleteEuNotification(item.id)
      window.dispatchEvent(new Event('eu-record-saved'))
    } finally {
      setBusyId(null)
    }
  }

  async function setDecisionOutcome(item: EuNotification, outcome: 'good' | 'mixed' | 'regret' | 'unknown') {
    if (!item.sourceId || busyId) return
    setBusyId(item.id)
    try {
      await updateRecord(item.sourceId, {
        outcome,
        outcomeAt: new Date().toISOString(),
      })
      deleteEuNotification(item.id)
      window.dispatchEvent(new Event('eu-record-saved'))
    } finally {
      setBusyId(null)
    }
  }

  function answerMood(item: EuNotification, mood: MoodValue) {
    saveMoodCheckin(mood)
    deleteEuNotification(item.id)
  }

  return (
    <div className="v2-page notifications-page">
      <BrandTop />
      <NavLink className="back-v2" to="/"><EuIcon name="arrow-left" />Hoje</NavLink>

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
        {groups.map((group) => (
          <section className="notification-group" key={group.label}>
            <div className="notification-group-title">
              <span>{group.label}</span>
              <b>{group.items.length}</b>
            </div>
            <div className="notification-group-list">
              {group.items.map((item) => (
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

                  {item.category === 'followup' && item.sourceId && (
                    <div className="notification-quick-actions">
                      <button disabled={busyId === item.id} onClick={() => void completeFollowup(item)}><EuIcon name="check" />concluir</button>
                      <button disabled={busyId === item.id} onClick={() => void snoozeFollowup(item)}><EuIcon name="clock" />adiar 7 dias</button>
                    </div>
                  )}

                  {item.category === 'decision' && item.sourceId && (
                    <div className="notification-decision-actions">
                      <button disabled={busyId === item.id} onClick={() => void setDecisionOutcome(item, 'good')}><EuIcon name="check" />foi boa</button>
                      <button disabled={busyId === item.id} onClick={() => void setDecisionOutcome(item, 'mixed')}><EuIcon name="neutral" />mais ou menos</button>
                      <button disabled={busyId === item.id} onClick={() => void setDecisionOutcome(item, 'regret')}><EuIcon name="undo" />me arrependi</button>
                      <button disabled={busyId === item.id} onClick={() => void setDecisionOutcome(item, 'unknown')}><EuIcon name="help" />ainda não sei</button>
                    </div>
                  )}

                  {item.category === 'humor' && (
                    <div className="notification-mood-actions" aria-label="Responder humor">
                      <button onClick={() => answerMood(item, 'animado')}><EuIcon name="smile" />bem</button>
                      <button onClick={() => answerMood(item, 'ok')}><EuIcon name="neutral" />ok</button>
                      <button onClick={() => answerMood(item, 'cansado')}><EuIcon name="moon" />cansado</button>
                      <button onClick={() => answerMood(item, 'pilhado')}><EuIcon name="bolt" />pilhado</button>
                    </div>
                  )}

                  <button className="notification-delete" aria-label="Apagar notificação" onClick={() => deleteEuNotification(item.id)}><EuIcon name="x" /></button>
                </article>
              ))}
            </div>
          </section>
        ))}

        {!items.length && (
          <div className="soft-empty wide">
            <span><EuIcon name="check" /></span>
            <p>Nada te chamando agora. Quando algo realmente merecer voltar, aparece aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
