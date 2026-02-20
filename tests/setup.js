import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { _resetDB, DB_NAME } from '../src/db.js';

// Provide localStorage polyfill for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
}

beforeEach(() => {
  _resetDB();
  // Delete the database so each test starts clean
  indexedDB.deleteDatabase(DB_NAME);
  // Reset localStorage between tests
  localStorage.clear();
});
