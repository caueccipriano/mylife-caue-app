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

export type StoredRecord = {
  id: string
  text: string
  type: string
  area: string
  createdAt: string
  source?: 'manual' | 'chatgpt' | 'import'
  attachments?: StoredAttachment[]
  status?: RecordStatus
  followUpAt?: string
  followUpDays?: number
  startedAt?: string
  completedAt?: string
  lastPromptedAt?: string
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
  version: 3
  exportedAt: string
  records: BackupRecord[]
  moods: MoodCheckin[]
}

type LegacyBackup = {
  version: 1 | 2
  exportedAt: string
  records: StoredRecord[]
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

export async function saveRecord(record: StoredRecord) {
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  tx.objectStore(RECORDS_STORE).put(record)

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

  store.put({ ...current, ...patch })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()
}

export async function listRecords(): Promise<StoredRecord[]> {
  await migrateLegacyRecords()
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readonly')
  const records = await requestToPromise(tx.objectStore(RECORDS_STORE).getAll())
  db.close()

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
        store.put({ ...record, text: record.text ?? '', source: record.source ?? 'manual' })
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
  }
}

export async function exportBackup() {
  const records = await listRecords()
  const backup: Backup = {
    version: 3,
    exportedAt: new Date().toISOString(),
    records: await Promise.all(records.map(serializeRecord)),
    moods: listMoodCheckins(),
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `eu-backup-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as Backup | LegacyBackup

  if (!Array.isArray(parsed?.records) || ![1, 2, 3].includes(parsed.version)) {
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
      store.put({ ...record, text: record.text ?? '' })
    }
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()

  if (parsed.version === 3 && Array.isArray(parsed.moods)) {
    localStorage.setItem(MOOD_KEY, JSON.stringify(parsed.moods.slice(-365)))
  }
}
