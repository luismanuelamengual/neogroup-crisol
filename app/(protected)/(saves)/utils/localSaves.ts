import { LocalSave } from '@/app/(protected)/(saves)/models/LocalSave'

/** The copy of the saved game in the browser: one per account, in IndexedDB. */

const DATABASE = 'crisol'
const STORE = 'saves'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)

    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'userId' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const database = await openDatabase()

  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE))

      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

/** The local copy of the account's game, or null (also when the browser has no IndexedDB, e.g. private mode). */
export async function readLocalSave(userId: number): Promise<LocalSave | null> {
  try {
    return (await run<LocalSave | undefined>('readonly', (store) => store.get(userId))) ?? null
  } catch {
    return null
  }
}

export async function writeLocalSave(save: LocalSave): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(save))
  } catch {
    // Without IndexedDB the game still works online: the server keeps the save.
  }
}

export async function deleteLocalSave(userId: number): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(userId))
  } catch {
    // Nothing to delete.
  }
}
