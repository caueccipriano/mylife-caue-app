const AUTO_LOCK_KEY = 'eu-security-autolock-v1'
const PRIVATE_TAGS_KEY = 'eu-security-private-tags-v1'
const DISCREET_KEY = 'eu-security-discreet-v1'
const LAST_BACKUP_KEY = 'eu-security-last-backup-v1'

export function getAutoLockMinutes() {
  const value = Number(localStorage.getItem(AUTO_LOCK_KEY))
  return [1, 5, 15, 30].includes(value) ? value : 5
}

export function setAutoLockMinutes(minutes: number) {
  const safe = [1, 5, 15, 30].includes(minutes) ? minutes : 5
  localStorage.setItem(AUTO_LOCK_KEY, String(safe))
  window.dispatchEvent(new Event('eu-security-updated'))
}

export function getPrivateTags() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRIVATE_TAGS_KEY) || '[]') as string[]
    return Array.isArray(parsed)
      ? parsed.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

export function setPrivateTags(tags: string[]) {
  const clean = [...new Set(tags.map((tag) => tag.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))]
  localStorage.setItem(PRIVATE_TAGS_KEY, JSON.stringify(clean))
  window.dispatchEvent(new Event('eu-security-updated'))
}

export function shouldAutoPrivate(tags: string[]) {
  const protectedTags = new Set(getPrivateTags())
  return tags.some((tag) => protectedTags.has(tag.toLowerCase()))
}

export function getDiscreetMode() {
  return localStorage.getItem(DISCREET_KEY) === '1'
}

export function applyDiscreetMode(enabled = getDiscreetMode()) {
  document.documentElement.dataset.euDiscreet = enabled ? '1' : '0'
}

export function setDiscreetMode(enabled: boolean) {
  localStorage.setItem(DISCREET_KEY, enabled ? '1' : '0')
  applyDiscreetMode(enabled)
  window.dispatchEvent(new Event('eu-security-updated'))
}

export function getLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_KEY)
}

export function markBackupCreated() {
  const value = new Date().toISOString()
  localStorage.setItem(LAST_BACKUP_KEY, value)
  window.dispatchEvent(new Event('eu-security-updated'))
  return value
}

export function haptic(pattern: 'light' | 'success' | 'warning' = 'light') {
  if (!('vibrate' in navigator)) return
  const vibration = pattern === 'success' ? [18, 30, 18] : pattern === 'warning' ? [40, 35, 40] : 12
  navigator.vibrate(vibration)
}
