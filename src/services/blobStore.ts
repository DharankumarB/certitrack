/**
 * Stores uploaded file contents in IndexedDB (falls back to memory when unavailable).
 * Only the blob key is kept in the shared application state; the file itself never leaves the browser.
 */
const DB_NAME = 'certitrack-files';
const STORE = 'blobs';
const memory = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  memory.set(key, blob);
  const db = await openDb();
  if (!db) return;
  try {
    await run(db, 'readwrite', (s) => s.put(blob, key));
  } catch {
    // Memory copy is kept for this session.
  }
}

export async function getBlob(key: string): Promise<Blob | null> {
  if (memory.has(key)) return memory.get(key)!;
  const db = await openDb();
  if (!db) return null;
  try {
    const result = await run<Blob | undefined>(db, 'readonly', (s) => s.get(key));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function deleteBlob(key: string): Promise<void> {
  memory.delete(key);
  const db = await openDb();
  if (!db) return;
  try {
    await run(db, 'readwrite', (s) => s.delete(key));
  } catch {
    // ignore
  }
}

export async function clearBlobs(): Promise<void> {
  memory.clear();
  const db = await openDb();
  if (!db) return;
  try {
    await run(db, 'readwrite', (s) => s.clear());
  } catch {
    // ignore
  }
}
