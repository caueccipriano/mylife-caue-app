export type StoredRecord = {
  id: string
  text: string
  type: string
  area: string
  createdAt: string
}

type Backup = {
  version: 1
  exportedAt: string
  records: StoredRecord[]
}

const DB_NAME = 'eu-life'
const DB_VERSION = 1
const RECORDS_STORE = 'records'

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

export async function listRecords(): Promise<StoredRecord[]> {
  await migrateLegacyRecords()
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readonly')
  const records = await requestToPromise(tx.objectStore(RECORDS_STORE).getAll())
  db.close()

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
      if (record?.id && record?.text && record?.createdAt) store.put(record)
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

export async function exportBackup() {
  const backup: Backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
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
  const parsed = JSON.parse(text) as Backup

  if (parsed?.version !== 1 || !Array.isArray(parsed.records)) {
    throw new Error('Backup incompatível.')
  }

  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readwrite')
  const store = tx.objectStore(RECORDS_STORE)

  parsed.records.forEach((record) => {
    if (record?.id && record?.text && record?.createdAt) store.put(record)
  })

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  db.close()
}
