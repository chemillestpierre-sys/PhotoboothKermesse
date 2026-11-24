import {PhotoRecord} from '../types';

const DB_NAME = 'kermesse_photobooth_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'id'});
        store.createIndex('createdAt', 'createdAt', {unique: false});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Erreur IndexedDB'));
  });
}

export async function savePhoto(record: PhotoRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Impossible d’enregistrer la photo'));
    };
  });
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      db.close();
      const rows = (request.result as PhotoRecord[]) || [];
      rows.sort((a, b) => b.createdAt - a.createdAt);
      resolve(rows);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error('Impossible de lire les photos'));
    };
  });
}

export async function incrementPhotoPrintCount(id: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    let updatedCount = 1;

    getReq.onsuccess = () => {
      const existing = getReq.result as PhotoRecord | undefined;
      if (existing) {
        updatedCount = (existing.printCount || 0) + 1;
        store.put({...existing, printCount: updatedCount});
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(updatedCount);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Erreur de mise à jour'));
    };
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Impossible de supprimer la photo'));
    };
  });
}

export async function clearAllPhotos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Impossible de tout effacer'));
    };
  });
}
