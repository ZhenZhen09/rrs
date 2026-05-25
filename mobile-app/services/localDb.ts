import * as SQLite from 'expo-sqlite';

/**
 * Enterprise Local Database Service (Phase 1.1)
 * 
 * Provides a persistent SQLite store for offline operational data.
 */
let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('rrs_local.db');
  await setupSchema(db);
  return db;
};

const setupSchema = async (database: SQLite.SQLiteDatabase) => {
  // 1. Sync Queue Table (Outbox)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      priority INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'failed'
      last_error TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  // 2. Active Tasks Cache (Offline Reading)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
};

export const clearCache = async () => {
  const database = await getDb();
  await database.execAsync('DELETE FROM tasks_cache');
};
