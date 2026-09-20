export type EuNotificationCategory =
  | 'humor'
  | 'followup'
  | 'decision'
  | 'capsule'
  | 'weekly'
  | 'monthly'
  | 'ecosystem'
  | 'insight'

export type EuNotificationPriority = 'essential' | 'useful' | 'silent'

export type EuNotification = {
  id: string
  title: string
  body: string
  category: EuNotificationCategory
  priority: EuNotificationPriority
  createdAt: string
  readAt?: string
  actionUrl?: string
  sourceId?: string
  dedupeKey?: string
}

export type NotificationPreferences = {
  enabled: boolean
  discreetPreview: boolean
  maxCommonPerDay: number
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  categories: Record<EuNotificationCategory, boolean>
}

const NOTIFICATIONS_KEY = 'eu-notifications-v1'
const PREFERENCES_KEY = 'eu-notification-preferences-v1'
const MAX_ITEMS = 120

const defaults: NotificationPreferences = {
  enabled: true,
  discreetPreview: false,
  maxCommonPerDay: 1,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
  categories: {
    humor: true,
    followup: true,
    decision: true,
    capsule: true,
    weekly: true,
    monthly: true,
    ecosystem: true,
    insight: true,
  },
}

function readArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function listEuNotifications() {
  return readArray<EuNotification>(NOTIFICATIONS_KEY)
    .filter((item) => item && item.id && item.title && item.category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadEuNotifications() {
  return listEuNotifications().filter((item) => !item.readAt)
}

export function saveEuNotification(input: Omit<EuNotification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const current = listEuNotifications()

  if (input.dedupeKey && current.some((item) => item.dedupeKey === input.dedupeKey)) {
    return current.find((item) => item.dedupeKey === input.dedupeKey) ?? null
  }

  const item: EuNotification = {
    ...input,
    id: input.id || crypto.randomUUID(),
    createdAt: input.createdAt || new Date().toISOString(),
  }

  const next = [item, ...current].slice(0, MAX_ITEMS)
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-notifications-updated'))
  return item
}

export function markEuNotificationRead(id: string) {
  const next = listEuNotifications().map((item) =>
    item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item,
  )
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-notifications-updated'))
}

export function markAllEuNotificationsRead() {
  const now = new Date().toISOString()
  const next = listEuNotifications().map((item) => ({ ...item, readAt: item.readAt || now }))
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-notifications-updated'))
}

export function deleteEuNotification(id: string) {
  const next = listEuNotifications().filter((item) => item.id !== id)
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-notifications-updated'))
}

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}') as Partial<NotificationPreferences>
    return {
      ...defaults,
      ...parsed,
      quietHours: { ...defaults.quietHours, ...(parsed.quietHours || {}) },
      categories: { ...defaults.categories, ...(parsed.categories || {}) },
    }
  } catch {
    return defaults
  }
}

export function setNotificationPreferences(patch: Partial<NotificationPreferences>) {
  const current = getNotificationPreferences()
  const next: NotificationPreferences = {
    ...current,
    ...patch,
    quietHours: { ...current.quietHours, ...(patch.quietHours || {}) },
    categories: { ...current.categories, ...(patch.categories || {}) },
  }
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-notification-preferences-updated'))
  return next
}

function minutesOfDay(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function isWithinQuietHours(date = new Date(), prefs = getNotificationPreferences()) {
  if (!prefs.quietHours.enabled) return false
  const current = date.getHours() * 60 + date.getMinutes()
  const start = minutesOfDay(prefs.quietHours.start)
  const end = minutesOfDay(prefs.quietHours.end)

  if (start === end) return true
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

export function canCreateNotification(category: EuNotificationCategory, priority: EuNotificationPriority) {
  const prefs = getNotificationPreferences()
  if (!prefs.enabled || !prefs.categories[category]) return false
  if (priority === 'essential') return true
  if (isWithinQuietHours(new Date(), prefs)) return false

  const today = new Date().toISOString().slice(0, 10)
  const commonToday = listEuNotifications().filter((item) =>
    item.createdAt.slice(0, 10) === today && item.priority !== 'essential',
  ).length

  return commonToday < Math.max(0, prefs.maxCommonPerDay)
}
