import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { _resetDB, DB_NAME } from '../src/db.js';

beforeEach(() => {
  _resetDB();
  // Delete the database so each test starts clean
  indexedDB.deleteDatabase(DB_NAME);
});
