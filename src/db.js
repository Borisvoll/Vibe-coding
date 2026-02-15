const DB_NAME = 'bpv-tracker';
const DB_VERSION = 2;

let dbInstance = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Hours store
        const hours = db.createObjectStore('hours', { keyPath: 'id' });
        hours.createIndex('date', 'date', { unique: true });
        hours.createIndex('week', 'week', { unique: false });
        hours.createIndex('type', 'type', { unique: false });

        // Logbook store
        const logbook = db.createObjectStore('logbook', { keyPath: 'id' });
        logbook.createIndex('date', 'date', { unique: false });
        logbook.createIndex('week', 'week', { unique: false });
        logbook.createIndex('tags', 'tags', { unique: false, multiEntry: true });

        // Photos store
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('logbookId', 'logbookId', { unique: false });

        // Settings store (key-value)
        db.createObjectStore('settings', { keyPath: 'key' });

        // Deleted store (for undo)
        const deleted = db.createObjectStore('deleted', { keyPath: 'id' });
        deleted.createIndex('store', 'store', { unique: false });
        deleted.createIndex('deletedAt', 'deletedAt', { unique: false });

        // Competencies store
        const competencies = db.createObjectStore('competencies', { keyPath: 'id' });
        competencies.createIndex('category', 'category', { unique: false });
        competencies.createIndex('updatedAt', 'updatedAt', { unique: false });

        // Assignments store
        const assignments = db.createObjectStore('assignments', { keyPath: 'id' });
        assignments.createIndex('type', 'type', { unique: false });

        // SMART goals store
        const goals = db.createObjectStore('goals', { keyPath: 'id' });
        goals.createIndex('status', 'status', { unique: false });

        // Quality (kwaliteitsborging) store
        const quality = db.createObjectStore('quality', { keyPath: 'id' });
        quality.createIndex('updatedAt', 'updatedAt', { unique: false });

        // Daily plans (Top 3 + evaluatie)
        const dailyPlans = db.createObjectStore('dailyPlans', { keyPath: 'id' });
        dailyPlans.createIndex('date', 'date', { unique: true });

        // Week reviews
        const weekReviews = db.createObjectStore('weekReviews', { keyPath: 'id' });
        weekReviews.createIndex('week', 'week', { unique: true });
      }
      if (oldVersion < 2) {
        const learningMoments = db.createObjectStore('learningMoments', { keyPath: 'id' });
        learningMoments.createIndex('date', 'date', { unique: false });
        learningMoments.createIndex('tags', 'tags', { unique: false, multiEntry: true });

        const reference = db.createObjectStore('reference', { keyPath: 'id' });
        reference.createIndex('category', 'category', { unique: false });

        const vault = db.createObjectStore('vault', { keyPath: 'id' });
        vault.createIndex('tags', 'tags', { unique: false, multiEntry: true });

        db.createObjectStore('vaultFiles', { keyPath: 'id' });

        const energy = db.createObjectStore('energy', { keyPath: 'id' });
        energy.createIndex('date', 'date', { unique: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function getDB() {
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance;
}

// ===== Generic CRUD =====

export async function getAll(storeName) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getByKey(storeName, key) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getByIndex(storeName, indexName, value) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put(storeName, record) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName, key) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===== Soft Delete + Undo =====

export async function softDelete(storeName, key) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, 'deleted'], 'readwrite');
    const sourceStore = tx.objectStore(storeName);
    const deletedStore = tx.objectStore('deleted');

    const getReq = sourceStore.get(key);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (!data) { resolve(null); return; }

      deletedStore.put({
        id: data.id,
        store: storeName,
        data: data,
        deletedAt: Date.now()
      });
      sourceStore.delete(key);
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function undoDelete(id) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['deleted'], 'readonly');
    const store = tx.objectStore('deleted');
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result;
      if (!record) { resolve(false); return; }

      const tx2 = db.transaction([record.store, 'deleted'], 'readwrite');
      tx2.objectStore(record.store).put(record.data);
      tx2.objectStore('deleted').delete(id);
      tx2.oncomplete = () => resolve(true);
      tx2.onerror = () => reject(tx2.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function purgeDeleted() {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('deleted', 'readwrite');
    const store = tx.objectStore('deleted');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ===== Settings =====

export async function getSetting(key) {
  const record = await getByKey('settings', key);
  return record ? record.value : null;
}

export async function setSetting(key, value) {
  return put('settings', { key, value });
}

// ===== Convenience queries =====

export async function getHoursByWeek(weekStr) {
  return getByIndex('hours', 'week', weekStr);
}

export async function getHoursByDate(dateStr) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('hours', 'readonly');
    const store = tx.objectStore('hours');
    const index = store.index('date');
    const request = index.get(dateStr);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getLogbookByWeek(weekStr) {
  return getByIndex('logbook', 'week', weekStr);
}

export async function getPhotosByLogbookId(logbookId) {
  return getByIndex('photos', 'logbookId', logbookId);
}

export async function getAllHoursSorted() {
  const all = await getAll('hours');
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAllLogbookSorted() {
  const all = await getAll('logbook');
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

// ===== Bulk operations =====

export async function clearAllData() {
  const db = getDB();
  const storeNames = ['hours', 'logbook', 'photos', 'competencies', 'assignments', 'goals', 'quality', 'dailyPlans', 'weekReviews', 'deleted', 'learningMoments', 'reference', 'vault', 'vaultFiles', 'energy'];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    storeNames.forEach(name => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function importAll(data) {
  const db = getDB();
  const storeNames = Object.keys(data).filter(k => {
    try { db.transaction(k, 'readonly'); return true; } catch { return false; }
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    for (const storeName of storeNames) {
      const store = tx.objectStore(storeName);
      const records = data[storeName];
      if (Array.isArray(records)) {
        records.forEach(record => store.put(record));
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportAllData() {
  const data = {};
  const storeNames = ['hours', 'logbook', 'photos', 'settings', 'competencies', 'assignments', 'goals', 'quality', 'dailyPlans', 'weekReviews', 'learningMoments', 'reference', 'energy'];
  for (const name of storeNames) {
    data[name] = await getAll(name);
  }
  return data;
}
