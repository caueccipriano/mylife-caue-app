import type { BridgeCard } from './integrations'
import type { StoredRecord } from './storage'

type VaultPayload = {
  version: 1
  updatedAt: string
  bridgeSummaries: Array<{
    app: string
    title: string
    status?: string
    summary?: string
    updatedAt?: string
    metrics?: Record<string, string | number | boolean | null>
  }>
  lifeDigest: {
    recordCount: number
    activeCount: number
    completedCount: number
    recentAreas: string[]
    recentTags: string[]
  }
}

type VaultEnvelope = {
  format: 'eu-local-sync-vault'
  version: 1
  iv: string
  data: string
  updatedAt: string
}

const SECRET_KEY = 'eu_sync_vault_device_secret_v1'
const VAULT_KEY = 'eu_sync_vault_v1'
const CHANNEL = 'eu-sync-vault-v1'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function getDeviceSecret() {
  const existing = localStorage.getItem(SECRET_KEY)
  if (existing) return base64ToBytes(existing)

  const secret = crypto.getRandomValues(new Uint8Array(32))
  localStorage.setItem(SECRET_KEY, bytesToBase64(secret))
  return secret
}

async function importDeviceKey() {
  return crypto.subtle.importKey(
    'raw',
    Uint8Array.from(getDeviceSecret()).buffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

function digest(records: StoredRecord[]) {
  const visible = records.filter((record) => !record.private && !record.trashedAt)
  const recent = visible.filter((record) => new Date(record.updatedAt || record.createdAt).getTime() > Date.now() - 45 * 86400000)
  const areaCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()

  recent.forEach((record) => {
    areaCounts.set(record.area, (areaCounts.get(record.area) || 0) + 1)
    ;(record.tags || []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1))
  })

  return {
    recordCount: visible.length,
    activeCount: visible.filter((record) => record.status === 'active').length,
    completedCount: visible.filter((record) => record.status === 'completed').length,
    recentAreas: [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([area]) => area),
    recentTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag),
  }
}

export async function writeLocalSyncVault(records: StoredRecord[], bridges: BridgeCard[]) {
  const payload: VaultPayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    bridgeSummaries: bridges
      .filter((card) => card.bridge)
      .map((card) => ({
        app: card.id,
        title: card.title,
        status: card.bridge?.status,
        summary: card.bridge?.summary,
        updatedAt: card.bridge?.updatedAt,
        metrics: card.bridge?.metrics,
      })),
    lifeDigest: digest(records),
  }

  const key = await importDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  )

  const envelope: VaultEnvelope = {
    format: 'eu-local-sync-vault',
    version: 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
    updatedAt: payload.updatedAt,
  }

  localStorage.setItem(VAULT_KEY, JSON.stringify(envelope))

  try {
    const channel = new BroadcastChannel(CHANNEL)
    channel.postMessage({ type: 'updated', updatedAt: envelope.updatedAt })
    channel.close()
  } catch {
    // BroadcastChannel não é obrigatório para o cofre funcionar.
  }

  window.dispatchEvent(new Event('eu-sync-vault-updated'))
  return envelope.updatedAt
}

export async function readLocalSyncVault(): Promise<VaultPayload | null> {
  const raw = localStorage.getItem(VAULT_KEY)
  if (!raw) return null

  try {
    const envelope = JSON.parse(raw) as VaultEnvelope
    if (envelope.format !== 'eu-local-sync-vault' || envelope.version !== 1) return null

    const key = await importDeviceKey()
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(base64ToBytes(envelope.iv)).buffer },
      key,
      Uint8Array.from(base64ToBytes(envelope.data)).buffer,
    )

    return JSON.parse(new TextDecoder().decode(decrypted)) as VaultPayload
  } catch {
    return null
  }
}

export function localSyncVaultMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VAULT_KEY) || 'null') as VaultEnvelope | null
    return parsed?.format === 'eu-local-sync-vault' ? { updatedAt: parsed.updatedAt, ready: true } : { updatedAt: null, ready: false }
  } catch {
    return { updatedAt: null, ready: false }
  }
}

export function watchLocalSyncVault(callback: () => void) {
  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = callback
  } catch {
    channel = null
  }

  const storage = (event: StorageEvent) => {
    if (event.key === VAULT_KEY) callback()
  }

  window.addEventListener('storage', storage)
  window.addEventListener('eu-sync-vault-updated', callback)

  return () => {
    channel?.close()
    window.removeEventListener('storage', storage)
    window.removeEventListener('eu-sync-vault-updated', callback)
  }
}

export function syncVaultSecurityNote() {
  return 'O Sync Vault é local e cifrado neste aparelho. A chave também fica neste mesmo armazenamento local para permitir sincronização automática entre os apps do mesmo domínio; por isso ele reduz exposição casual, mas não substitui o backup criptografado por senha.'
}
