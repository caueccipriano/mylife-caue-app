import { markBackupCreated, shouldAutoPrivate } from './securitySettings'

export type AttachmentKind = 'photo' | 'document' | 'audio' | 'link'

export type StoredAttachment = {
  id: string
  kind: AttachmentKind
  name: string
  mimeType?: string
  size?: number
  blob?: Blob
  url?: string
}

export type RecordStatus = 'active' | 'completed' | 'paused' | 'abandoned'
export type RecordSource = 'manual' | 'chatgpt' | 'import' | 'share' | 'folego' | 'traco' | 'repertorio'
export type RecordFreshness = 'current' | 'maybe-stale' | 'historical'
export type RecordOutcome = 'good' | 'mixed' | 'regret' | 'unknown'
export type RecordProgress = 'started' | 'quarter' | 'half' | 'almost' | 'done'

export type RecordRevision = {
  at: string
  text: string
  type: string
  area: string
  status?: RecordStatus
  journeyStage?: string
  tags?: string[]
  whyItMatters?: string
  nextMove?: string
  progressLevel?: RecordProgress
}

export type StoredRecord = {
  id: string
  text: string
  type: string
  area: string
  createdAt: string
  source?: RecordSource
  attachments?: StoredAttachment[]
  status?: RecordStatus
  followUpAt?: string
  followUpDays?: number
  startedAt?: string
  completedAt?: string
  lastPromptedAt?: string
  tags?: string[]
  favorite?: boolean
  pinned?: boolean
  private?: boolean
  journeyStage?: string
  relatedIds?: string[]
  updatedAt?: string
  trashedAt?: string
  whyItMatters?: string
  freshness?: RecordFreshness
  outcome?: RecordOutcome
  outcomeAt?: string
  progressLevel?: RecordProgress
  nextMove?: string
  someday?: boolean
  chapterId?: string
  revisions?: RecordRevision[]
}

export type MoodValue = 'animado' | 'ok' | 'cansado' | 'pilhado'

export type MoodCheckin = {
  date: string
  mood: MoodValue
  createdAt: string
}

type BackupAttachment = Omit<StoredAttachment, 'blob'> & {
  dataUrl?: string
}

type BackupRecord = Omit<StoredRecord, 'attachments'> & {
  attachments?: BackupAttachment[]
}

type Backup = {
  version: 5
  exportedAt: string
  records: BackupRecord[]
  moods: MoodCheckin[]
}

type LegacyBackup = {
  version: 1 | 2 | 3 | 4
  exportedAt: string
  records: StoredRecord[]
  moods?: MoodCheckin[]
}

type EncryptedBackupEnvelope = {
  format: 'eu-encrypted-backup'
  version: 1
  createdAt: string
  kdf: {
    name: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
    salt: string
  }
  cipher: {
    name: 'AES-GCM'
    iv: string
    data: string
  }
}

const DB_NAME = 'eu-life'
const DB_VERSION = 1
const RECORDS_STORE = 'records'
const MOOD_KEY = 'eu-mood-checkins-v1'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const store = db.createObjectStore(RECORDS_STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
        store.createIndex('type', 'type')
        store.createIndex('area', 'area')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function snapshotRevision(record: StoredRecord): RecordRevision {
  return {
    at: new Date().toISOString(),
    text: record.text,
    type: record.type,
    area: record.area,
    status: record.status,
    journeyStage: record.journeyStage,
    tags: record.tags ? [...record.tags] : undefined,
    whyItMatters: record.whyItMatters,
    nextMove: record.nextMove,
    progressLevel: record.progressLevel,
  }
}

function revisionWorthSaving(current: StoredRecord, patch: Partial<StoredRecord>) {
  const keys: Array<keyof StoredRecord> = [
    'text',
    'type',
    'area',
    'status',
    'journeyStage',
    'tags',
    'whyItMatters',
    'nextMove',
    'progressLevel',
    'outcome',
    'freshness',
  ]

  return keys.some((key) => {
    if (!(key in patch)) return false
    return JSON.stringify(current[key]) !== JSON.stringify(patch[key])
  })
}

export async function saveRecord(record: StoredRecord) {
  const tags = record.tags ?? suggestTags(record.text, record.area, record.type)
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  tx.objectStore(RECORDS_STORE).put({
    ...record,
    tags,
    private: record.private ?? shouldAutoPrivate(tags),
    freshness: record.freshness ?? 'current',
    journeyStage: record.journeyStage ?? defaultJourneyStage(record.type, record.status),
    relatedIds: record.relatedIds ?? [],
    revisions: record.revisions ?? [],
    updatedAt: record.updatedAt ?? record.createdAt,
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()
}

export async function updateRecord(id: string, patch: Partial<StoredRecord>) {
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  const store = tx.objectStore(RECORDS_STORE)
  const current = await requestToPromise(store.get(id)) as StoredRecord | undefined

  if (!current) {
    db.close()
    throw new Error('Registro não encontrado.')
  }

  const nextTags = patch.tags ?? current.tags ?? []
  const autoPrivate = shouldAutoPrivate(nextTags)
  const revisions = revisionWorthSaving(current, patch)
    ? [...(current.revisions ?? []), snapshotRevision(current)].slice(-25)
    : current.revisions ?? []

  store.put({
    ...current,
    ...patch,
    private: patch.private ?? (current.private || autoPrivate),
    revisions,
    updatedAt: new Date().toISOString(),
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()
}

export async function getRecord(id: string): Promise<StoredRecord | null> {
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readonly')
  const record = await requestToPromise(tx.objectStore(RECORDS_STORE).get(id)) as StoredRecord | undefined
  db.close()
  return record ?? null
}

async function allRecords(): Promise<StoredRecord[]> {
  await migrateLegacyRecords()
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readonly')
  const records = await requestToPromise(tx.objectStore(RECORDS_STORE).getAll())
  db.close()
  return records
}

export async function listRecords(): Promise<StoredRecord[]> {
  const records = await allRecords()
  return records
    .filter((record) => !record.trashedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listTrash(): Promise<StoredRecord[]> {
  const records = await allRecords()
  return records
    .filter((record) => Boolean(record.trashedAt))
    .sort((a, b) => String(b.trashedAt).localeCompare(String(a.trashedAt)))
}

export async function deleteRecord(id: string) {
  await updateRecord(id, { trashedAt: new Date().toISOString() })
}

export async function restoreRecord(id: string) {
  await updateRecord(id, { trashedAt: undefined })
}

export async function permanentlyDeleteRecord(id: string) {
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  tx.objectStore(RECORDS_STORE).delete(id)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()
}

export async function emptyExpiredTrash(retentionDays = 30) {
  const trash = await listTrash()
  const cutoff = Date.now() - retentionDays * 86400000
  const expired = trash.filter((record) => new Date(record.trashedAt as string).getTime() < cutoff)
  for (const record of expired) {
    await permanentlyDeleteRecord(record.id)
  }
  return expired.length
}

export function suggestTags(text: string, area: string, type: string) {
  const source = (text + ' ' + area + ' ' + type).toLowerCase()
  const rules: Array<[string, string[]]> = [
    ['carreira', ['carreira', 'vaga', 'trabalho', 'pleno', 'senior', 'sênior', 'currículo', 'curriculo']],
    ['dados', ['dados', 'sql', 'python', 'power bi', 'analytics']],
    ['sql', ['sql', 't-sql']],
    ['powerbi', ['power bi', 'powerbi']],
    ['curso', ['curso', 'certificação', 'certificacao', 'aula', 'estudo']],
    ['compras', ['comprar', 'compra', 'preço', 'preco', 'pesquisando']],
    ['carro', ['carro', 'onix', 'gol', 'veículo', 'veiculo']],
    ['relógios', ['relógio', 'relogio', 'casio']],
    ['viagem', ['viagem', 'viajar', 'hotel', 'passagem', 'roteiro']],
    ['finanças', ['dinheiro', 'orçamento', 'orcamento', 'cartão', 'cartao', 'investir']],
    ['leitura', ['livro', 'kindle', 'leitura']],
    ['design', ['design', 'layout', 'interface', 'branding']],
    ['apps', ['app', 'pwa', 'aplicativo']],
    ['pessoas', ['amigo', 'amiga', 'namorado', 'namorada', 'colega', 'chefe']],
    ['saúde', ['saúde', 'saude', 'médico', 'medico', 'exame', 'remédio', 'remedio']],
  ]

  const tags = rules
    .filter(([, terms]) => terms.some((term) => source.includes(term)))
    .map(([tag]) => tag)

  const normalizedArea = area.trim().toLowerCase()
  if (normalizedArea && !tags.includes(normalizedArea)) tags.unshift(normalizedArea)

  return [...new Set(tags)].slice(0, 8)
}

export function defaultJourneyStage(type: string, status?: RecordStatus) {
  if (status === 'completed') return 'Concluído'
  if (status === 'paused') return 'Pausado'
  if (status === 'abandoned') return 'Desisti'

  const value = type.toLowerCase()
  if (value.includes('pesquisa')) return 'Pesquisando'
  if (value.includes('desejo')) return 'Gostei'
  if (value.includes('curso')) return 'Em andamento'
  if (value.includes('objetivo') || value.includes('projeto')) return 'Planejando'
  if (value.includes('pend')) return 'Preciso fazer'
  if (value.includes('depois')) return 'Depois'
  return status === 'active' ? 'Em andamento' : ''
}

export async function listRecordsWithStaleness(): Promise<StoredRecord[]> {
  const records = await listRecords()
  const now = Date.now()

  return records.map((record) => {
    const ageDays = (now - new Date(record.updatedAt || record.createdAt).getTime()) / 86400000
    if (record.freshness === 'historical') return record
    if (ageDays >= 180 && ['Preferência', 'Desejo', 'Pesquisa', 'Contexto'].includes(record.type)) {
      return { ...record, freshness: 'maybe-stale' }
    }
    return record
  })
}

export function activeFollowUps(records: StoredRecord[], now = new Date()) {
  return records
    .filter((record) => record.status === 'active' && record.followUpAt)
    .sort((a, b) => String(a.followUpAt).localeCompare(String(b.followUpAt)))
    .map((record) => ({
      record,
      due: new Date(record.followUpAt as string).getTime() <= now.getTime(),
    }))
}

export function nextFollowUpDate(days: number, from = new Date()) {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

function moodDateKey(value = new Date()) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

export function listMoodCheckins(): MoodCheckin[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MOOD_KEY) || '[]') as MoodCheckin[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function moodForToday() {
  const today = moodDateKey()
  return listMoodCheckins().find((item) => item.date === today) ?? null
}

export function saveMoodCheckin(mood: MoodValue) {
  const today = moodDateKey()
  const current = listMoodCheckins().filter((item) => item.date !== today)
  const checkin: MoodCheckin = {
    date: today,
    mood,
    createdAt: new Date().toISOString(),
  }
  current.push(checkin)
  localStorage.setItem(MOOD_KEY, JSON.stringify(current.slice(-365)))
  window.dispatchEvent(new Event('eu-mood-updated'))
  return checkin
}

async function migrateLegacyRecords() {
  const legacy = localStorage.getItem('eu-records')
  if (!legacy) return

  try {
    const parsed = JSON.parse(legacy) as StoredRecord[]
    if (!Array.isArray(parsed) || !parsed.length) {
      localStorage.removeItem('eu-records')
      return
    }

    const db = await openDatabase()
    const tx = db.transaction(RECORDS_STORE, 'readwrite')
    const store = tx.objectStore(RECORDS_STORE)

    parsed.forEach((record) => {
      if (record?.id && record?.createdAt) {
        store.put({
          ...record,
          text: record.text ?? '',
          source: record.source ?? 'manual',
          freshness: record.freshness ?? 'current',
          revisions: record.revisions ?? [],
        })
      }
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })

    db.close()
    localStorage.removeItem('eu-records')
  } catch {
    // O dado legado é mantido caso a migração não possa ser concluída.
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl)
  return response.blob()
}

async function serializeRecord(record: StoredRecord): Promise<BackupRecord> {
  const attachments = await Promise.all(
    (record.attachments ?? []).map(async (attachment): Promise<BackupAttachment> => {
      const { blob, ...rest } = attachment
      return {
        ...rest,
        dataUrl: blob ? await blobToDataUrl(blob) : undefined,
      }
    }),
  )

  return {
    ...record,
    attachments,
  }
}

async function deserializeRecord(record: BackupRecord): Promise<StoredRecord> {
  const attachments = await Promise.all(
    (record.attachments ?? []).map(async (attachment): Promise<StoredAttachment> => {
      const { dataUrl, ...rest } = attachment
      return {
        ...rest,
        blob: dataUrl ? await dataUrlToBlob(dataUrl) : undefined,
      }
    }),
  )

  return {
    ...record,
    source: record.source ?? 'import',
    attachments,
    revisions: record.revisions ?? [],
    freshness: record.freshness ?? 'current',
  }
}

async function buildBackup(): Promise<Backup> {
  const records = await allRecords()
  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    records: await Promise.all(records.map(serializeRecord)),
    moods: listMoodCheckins(),
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function exportBackup() {
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `eu-backup-${stamp}.json`)
  markBackupCreated()
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

async function deriveBackupKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: Uint8Array.from(salt).buffer,
      iterations: 180000,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function exportEncryptedBackup(password: string) {
  if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.')

  const backup = await buildBackup()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveBackupKey(password, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer },
    key,
    new TextEncoder().encode(JSON.stringify(backup)),
  )

  const envelope: EncryptedBackupEnvelope = {
    format: 'eu-encrypted-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 180000,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
    },
  }

  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(
    new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' }),
    `eu-backup-seguro-${stamp}.eubackup`,
  )
  markBackupCreated()
}

async function restoreBackupData(parsed: Backup | LegacyBackup) {
  if (!Array.isArray(parsed?.records) || ![1, 2, 3, 4, 5].includes(parsed.version)) {
    throw new Error('Backup incompatível.')
  }

  const records: StoredRecord[] =
    parsed.version >= 2
      ? await Promise.all((parsed.records as BackupRecord[]).map(deserializeRecord))
      : parsed.records.map((record) => ({ ...record, source: record.source ?? 'import' }))

  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  const store = tx.objectStore(RECORDS_STORE)

  records.forEach((record) => {
    if (record?.id && record?.createdAt) {
      store.put({
        ...record,
        text: record.text ?? '',
        source: record.source ?? 'import',
        revisions: record.revisions ?? [],
        freshness: record.freshness ?? 'current',
      })
    }
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()

  if (parsed.version >= 3 && Array.isArray((parsed as Backup).moods)) {
    localStorage.setItem(MOOD_KEY, JSON.stringify((parsed as Backup).moods.slice(-365)))
  }
}

export async function importBackup(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as Backup | LegacyBackup
  await restoreBackupData(parsed)
}

export async function importEncryptedBackup(file: File, password: string) {
  const text = await file.text()
  const envelope = JSON.parse(text) as EncryptedBackupEnvelope

  if (envelope?.format !== 'eu-encrypted-backup' || envelope.version !== 1) {
    throw new Error('Esse arquivo não é um backup criptografado do EU.')
  }

  const salt = base64ToBytes(envelope.kdf.salt)
  const iv = base64ToBytes(envelope.cipher.iv)
  const data = base64ToBytes(envelope.cipher.data)
  const key = await deriveBackupKey(password, salt)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer },
      key,
      Uint8Array.from(data).buffer,
    )
    const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as Backup
    await restoreBackupData(parsed)
  } catch {
    throw new Error('Senha incorreta ou backup corrompido.')
  }
}

export async function inspectBackup(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as Backup | LegacyBackup
  if (!Array.isArray(parsed?.records) || ![1, 2, 3, 4, 5].includes(parsed.version)) {
    throw new Error('Backup incompatível.')
  }

  const attachments = parsed.records.reduce((total, record) => total + ((record as BackupRecord).attachments?.length ?? 0), 0)
  const privateRecords = parsed.records.filter((record) => record.private).length
  return {
    version: parsed.version,
    records: parsed.records.length,
    attachments,
    privateRecords,
    moods: Array.isArray((parsed as Backup).moods) ? (parsed as Backup).moods.length : 0,
    exportedAt: parsed.exportedAt,
  }
}
