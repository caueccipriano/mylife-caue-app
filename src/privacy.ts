import { getAutoLockMinutes } from './securitySettings'

const CONFIG_KEY = 'eu-private-pin-v1'
const SESSION_KEY = 'eu-private-unlocked-v1'

type PrivacyConfig = {
  salt: string
  hash: string
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function derive(pin: string, salt: Uint8Array) {
  const saltBuffer = Uint8Array.from(salt).buffer
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations: 120000,
    },
    key,
    256,
  )

  return bytesToBase64(new Uint8Array(bits))
}

export function hasPrivacyPin() {
  return Boolean(localStorage.getItem(CONFIG_KEY))
}

export function isPrivateUnlocked() {
  return !hasPrivacyPin() || sessionStorage.getItem(SESSION_KEY) === '1'
}

export function lockPrivateRecords() {
  sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('eu-privacy-updated'))
}

export async function setPrivacyPin(pin: string) {
  if (!/^\d{6,8}$/.test(pin)) {
    throw new Error('Use de 6 a 8 números.')
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt)
  const config: PrivacyConfig = {
    salt: bytesToBase64(salt),
    hash,
  }

  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  sessionStorage.setItem(SESSION_KEY, '1')
  window.dispatchEvent(new Event('eu-privacy-updated'))
}

export async function unlockPrivateRecords(pin: string) {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) {
    sessionStorage.setItem(SESSION_KEY, '1')
    return true
  }

  try {
    const config = JSON.parse(raw) as PrivacyConfig
    const salt = base64ToBytes(config.salt)
    const hash = await derive(pin, salt)
    const valid = hash === config.hash
    if (valid) {
      sessionStorage.setItem(SESSION_KEY, '1')
      window.dispatchEvent(new Event('eu-privacy-updated'))
    }
    return valid
  } catch {
    return false
  }
}

export async function changePrivacyPin(currentPin: string, newPin: string) {
  const valid = await unlockPrivateRecords(currentPin)
  if (!valid) throw new Error('PIN atual incorreto.')
  await setPrivacyPin(newPin)
}

export function removePrivacyPin() {
  localStorage.removeItem(CONFIG_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('eu-privacy-updated'))
}


let hiddenAt: number | null = null

export function initPrivacyAutoLock() {
  const handler = () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      return
    }

    if (hiddenAt == null || !hasPrivacyPin()) {
      hiddenAt = null
      return
    }

    const elapsed = Date.now() - hiddenAt
    const threshold = getAutoLockMinutes() * 60 * 1000
    hiddenAt = null

    if (elapsed >= threshold) {
      lockPrivateRecords()
    }
  }

  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
