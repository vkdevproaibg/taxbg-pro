const DB_NAME = 'taxbg-backup'
const STORE_NAME = 'backups'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function createLocalBackup(): string {
  const data: Record<string, string | null> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('taxbg-')) {
      data[key] = localStorage.getItem(key)
    }
  }

  return JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    keys: data,
  }, null, 2)
}

export function restoreLocalBackup(json: string): { restored: number; errors: string[] } {
  const errors: string[] = []
  let restored = 0

  try {
    const parsed = JSON.parse(json) as {
      version?: number
      keys?: Record<string, string | null>
    }

    if (!parsed.keys || typeof parsed.keys !== 'object') {
      return { restored: 0, errors: ['Invalid backup format: missing keys'] }
    }

    for (const [key, value] of Object.entries(parsed.keys)) {
      if (!key.startsWith('taxbg-')) {
        errors.push(`Skipped non-taxbg key: ${key}`)
        continue
      }
      try {
        if (value !== null) {
          localStorage.setItem(key, value)
          restored++
        }
      } catch (err) {
        errors.push(`Failed to restore ${key}: ${err}`)
      }
    }
  } catch (err) {
    return { restored: 0, errors: [`JSON parse error: ${err}`] }
  }

  return { restored, errors }
}

export async function autoBackupToIndexedDB(): Promise<void> {
  try {
    const db = await openDB()
    const backupJson = createLocalBackup()

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({
      id: 'auto',
      data: backupJson,
      createdAt: new Date().toISOString(),
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    db.close()
  } catch (err) {
    console.warn('[localBackup] autoBackupToIndexedDB failed:', err)
  }
}

export async function restoreFromIndexedDB(): Promise<{ restored: number; errors: string[] } | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get('auto')

    const result = await new Promise<{ data: string } | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    db.close()

    if (!result?.data) return null
    return restoreLocalBackup(result.data)
  } catch (err) {
    console.warn('[localBackup] restoreFromIndexedDB failed:', err)
    return null
  }
}
