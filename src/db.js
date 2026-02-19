export const DB_NAME = 'bpv-tracker';
export const DB_VERSION = 6;

let dbInstance = null;

let writeGuardEnabled = false;
let activeWriteOps = 0;
let writeDrainResolvers = [];
let writeResumeResolvers = [];

async function waitForWriteAccess() {
  if (!writeGuardEnabled) return;
  await new Promise((resolve) => {
    writeResumeResolvers.push(resolve);
  });
}

async function withWriteAccess(operation) {
  await waitForWriteAccess();
  activeWriteOps += 1;
  try {
    return await operation();
  } finally {
    activeWriteOps -= 1;
    if (activeWriteOps === 0 && writeDrainResolvers.length) {
      writeDrainResolvers.forEach((resolve) => resolve());
      writeDrainResolvers = [];
    }
  }
}

export async function acquireWriteGuard() {
  writeGuardEnabled = true;
  if (activeWriteOps > 0) {
    await new Promise((resolve) => {
      writeDrainResolvers.push(resolve);
    });
  }
}

export function releaseWriteGuard() {
  writeGuardEnabled = false;
  if (writeResumeResolvers.length) {
    writeResumeResolvers.forEach((resolve) => resolve());
    writeResumeResolvers = [];
  }
}


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

      if (oldVersion < 3) {
        const osSchoolProjects = db.createObjectStore('os_school_projects', { keyPath: 'id' });
        osSchoolProjects.createIndex('updated_at', 'updated_at', { unique: false });

        const osSchoolMilestones = db.createObjectStore('os_school_milestones', { keyPath: 'id' });
        osSchoolMilestones.createIndex('dueDate', 'dueDate', { unique: false });
        osSchoolMilestones.createIndex('updated_at', 'updated_at', { unique: false });

        const osSchoolSkills = db.createObjectStore('os_school_skills', { keyPath: 'id' });
        osSchoolSkills.createIndex('name', 'name', { unique: false });
        osSchoolSkills.createIndex('updated_at', 'updated_at', { unique: false });

        const osSchoolConcepts = db.createObjectStore('os_school_concepts', { keyPath: 'id' });
        osSchoolConcepts.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        osSchoolConcepts.createIndex('projectLink', 'projectLink', { unique: false });
        osSchoolConcepts.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (oldVersion < 4) {
        const osPersonalTasks = db.createObjectStore('os_personal_tasks', { keyPath: 'id' });
        osPersonalTasks.createIndex('updated_at', 'updated_at', { unique: false });

        const osPersonalAgenda = db.createObjectStore('os_personal_agenda', { keyPath: 'id' });
        osPersonalAgenda.createIndex('start', 'start', { unique: false });
        osPersonalAgenda.createIndex('updated_at', 'updated_at', { unique: false });

        const osPersonalActions = db.createObjectStore('os_personal_actions', { keyPath: 'id' });
        osPersonalActions.createIndex('updated_at', 'updated_at', { unique: false });

        const osPersonalWellbeing = db.createObjectStore('os_personal_wellbeing', { keyPath: 'id' });
        osPersonalWellbeing.createIndex('updated_at', 'updated_at', { unique: false });

        const osPersonalReflections = db.createObjectStore('os_personal_reflections', { keyPath: 'id' });
        osPersonalReflections.createIndex('updated_at', 'updated_at', { unique: false });

        const osPersonalWeekPlan = db.createObjectStore('os_personal_week_plan', { keyPath: 'id' });
        osPersonalWeekPlan.createIndex('day', 'day', { unique: false });
        osPersonalWeekPlan.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (oldVersion < 5) {
        const osInbox = db.createObjectStore('os_inbox', { keyPath: 'id' });
        osInbox.createIndex('mode', 'mode', { unique: false });
        osInbox.createIndex('status', 'status', { unique: false });
        osInbox.createIndex('updated_at', 'updated_at', { unique: false });

        const osTasks = db.createObjectStore('os_tasks', { keyPath: 'id' });
        osTasks.createIndex('mode', 'mode', { unique: false });
        osTasks.createIndex('status', 'status', { unique: false });
        osTasks.createIndex('date', 'date', { unique: false });
        osTasks.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (oldVersion < 6) {
        const osProjects = db.createObjectStore('os_projects', { keyPath: 'id' });
        osProjects.createIndex('mode', 'mode', { unique: false });
        osProjects.createIndex('status', 'status', { unique: false });
        osProjects.createIndex('updated_at', 'updated_at', { unique: false });
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

export function getStoreNames() {
  return Array.from(getDB().objectStoreNames);
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
  return withWriteAccess(async () => {
    const db = getDB();
    const normalized = record && typeof record === 'object' && 'id' in record && storeName !== 'deleted'
      ? { ...record, updatedAt: record.updatedAt || new Date().toISOString() }
      : record;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(normalized);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function remove(storeName, key) {
  return withWriteAccess(async () => {
    const db = getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
        deletedAt: new Date().toISOString()
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
  return withWriteAccess(async () => {
    const db = getDB();
    const storeNames = ['hours', 'logbook', 'photos', 'competencies', 'assignments', 'goals', 'quality', 'dailyPlans', 'weekReviews', 'deleted', 'learningMoments', 'reference', 'vault', 'vaultFiles', 'energy', 'os_school_projects', 'os_school_milestones', 'os_school_skills', 'os_school_concepts', 'os_personal_tasks', 'os_personal_agenda', 'os_personal_actions', 'os_personal_wellbeing', 'os_personal_reflections', 'os_personal_week_plan', 'os_inbox', 'os_tasks', 'os_projects'];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      storeNames.forEach(name => tx.objectStore(name).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function importAll(data) {
  return withWriteAccess(async () => {
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
  });
}

export async function exportAllData() {
  const data = {};
  const storeNames = ['hours', 'logbook', 'photos', 'settings', 'competencies', 'assignments', 'goals', 'quality', 'dailyPlans', 'weekReviews', 'learningMoments', 'reference', 'energy', 'deleted', 'os_school_projects', 'os_school_milestones', 'os_school_skills', 'os_school_concepts', 'os_personal_tasks', 'os_personal_agenda', 'os_personal_actions', 'os_personal_wellbeing', 'os_personal_reflections', 'os_personal_week_plan', 'os_inbox', 'os_tasks', 'os_projects'];
  for (const name of storeNames) {
    data[name] = await getAll(name);
  }
  return data;
}

/** Reset DB instance — for testing only. */
export function _resetDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
