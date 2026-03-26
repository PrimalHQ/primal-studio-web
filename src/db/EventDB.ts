import { EventReference } from "src/primal_api/references";

const DB_NAME = 'EventDB';
const STORE_NAME = 'referencedEvents';
const DB_VERSION = 1; // Incremented for index addition
const MAX_OBJECTS = 500;

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create object store with 'reference' as the key path
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'reference' });
        // Create index on updated_at for sorting
        store.createIndex('updated_at', 'updated_at', { unique: false });
      } else {
        // Handle upgrade: add index if it doesn't exist
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('updated_at')) {
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }
      }
    };
  });
}

// Write an object to IndexedDB
export async function writeObject(obj: EventReference): Promise<void> {
  const db = await openDB();

  // Add/update timestamp
  const objWithTimestamp = {
    ...obj,
    updated_at: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(objWithTimestamp);

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      // After writing, check if we need to clean up old objects
      await cleanupOldObjects(db);
      resolve();
    };

    transaction.oncomplete = () => db.close();
  });
}

// Read an object from IndexedDB by reference
export async function readObject(reference: string): Promise<EventReference | undefined> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(reference);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => db.close();
  });
}

// Bonus: Read all objects
export async function readAllObjects(): Promise<EventReference[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => db.close();
  });
}

// Bonus: Delete an object by reference
export async function deleteObject(reference: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(reference);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

// Clean up old objects if count exceeds MAX_OBJECTS
async function cleanupOldObjects(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;

      if (count <= MAX_OBJECTS) {
        resolve();
        return;
      }

      // Need to delete oldest objects
      const deleteCount = count - MAX_OBJECTS;
      const index = store.index('updated_at');
      const cursorRequest = index.openCursor(); // Iterates in ascending order (oldest first)
      let deleted = 0;

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && deleted < deleteCount) {
          store.delete(cursor.primaryKey);
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}

// Get count of stored objects
export async function getObjectCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => db.close();
  });
}
