type WebRow = Record<string, any>;

class WebDatabase {
  private locationOutbox: WebRow[] = [];
  private syncQueue: WebRow[] = [];
  private tasksCache = new Map<string, WebRow>();
  private statusActions = new Map<string, WebRow>();

  constructor() {
    try {
      const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem('rrs_local_db_v1');
      if (!saved) return;
      const value = JSON.parse(saved);
      this.locationOutbox = value.locationOutbox || [];
      this.syncQueue = value.syncQueue || [];
      this.tasksCache = new Map(value.tasksCache || []);
      this.statusActions = new Map(value.statusActions || []);
      let migrated = false;
      for (const action of this.statusActions.values()) {
        if (action.state === 'syncing') {
          action.state = 'pending';
          migrated = true;
        }
      }
      for (const item of this.syncQueue) {
        if (item.status === 'syncing') {
          item.status = 'pending';
          migrated = true;
        }
        if (/^\/api\/requests\/[^/]+\/status$/.test(item.endpoint) && ['pending', 'syncing'].includes(item.status)) {
          item.status = 'failed';
          item.last_error = 'Legacy rider status action requires review';
          migrated = true;
        }
      }
      if (migrated) this.persist();
    } catch {
      this.persist();
    }
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('rrs_local_db_v1', JSON.stringify({
      locationOutbox: this.locationOutbox,
      syncQueue: this.syncQueue,
      tasksCache: [...this.tasksCache],
      statusActions: [...this.statusActions],
    }));
  }

  async execAsync() {
    return undefined;
  }

  async runAsync(sql: string, params: any[] = []) {
    if (sql.includes('INSERT OR IGNORE INTO location_outbox')) {
      const [event_id, session_id, request_id, rider_id, sequence, payload, created_at, expires_at] = params;
      if (!this.locationOutbox.some((row) => row.event_id === event_id)) {
        this.locationOutbox.push({ event_id, session_id, request_id, rider_id, sequence, payload, status: 'pending', created_at, expires_at });
      }
    } else if (sql.includes('DELETE FROM location_outbox')) {
      const ids = params.filter((value) => typeof value === 'string');
      this.locationOutbox = this.locationOutbox.filter((row) => !ids.includes(row.event_id));
    } else if (sql.includes("status = 'rejected'") || sql.includes("status = 'pending', retry_count")) {
      const error = params[0];
      const ids = params.slice(1);
      this.locationOutbox.forEach((row) => {
        if (ids.includes(row.event_id)) {
          row.status = sql.includes("status = 'rejected'") ? 'rejected' : 'pending';
          row.last_error = error;
          row.retry_count = (row.retry_count || 0) + (row.status === 'pending' ? 1 : 0);
        }
      });
    } else if (sql.includes('INSERT INTO sync_queue')) {
      const [endpoint, method, payload, idempotency_key, created_at, expires_at] = params;
      this.syncQueue.push({ id: this.syncQueue.length + 1, endpoint, method, payload, idempotency_key, created_at, expires_at, status: 'pending', retry_count: 0 });
    } else if (sql.includes('UPDATE sync_queue')) {
      const itemId = params[params.length - 1];
      const row = this.syncQueue.find((item) => item.id === itemId);
      if (row) {
        row.status = sql.includes("status = 'failed'") ? 'failed' : sql.includes("status = 'syncing'") ? 'syncing' : 'pending';
        row.last_error = params.length > 1 ? params[0] : row.last_error;
        row.retry_count = (row.retry_count || 0) + (sql.includes('retry_count = retry_count + 1') ? 1 : 0);
      }
    } else if (sql.includes('DELETE FROM sync_queue')) {
      this.syncQueue = this.syncQueue.filter((row) => row.id !== params[0]);
    } else if (sql.includes('INSERT OR REPLACE INTO tasks_cache')) {
      const [id, data, updated_at] = params;
      this.tasksCache.set(id, { id, data, updated_at });
    } else if (sql.includes('INSERT OR IGNORE INTO rider_status_actions')) {
      const [operation_id, rider_id, request_id, status, remark, timestamp, created_at] = params;
      if (!this.statusActions.has(operation_id)) this.statusActions.set(operation_id, { operation_id, rider_id, request_id, status, remark, timestamp, state: 'pending', last_error: null, created_at, updated_at: created_at });
    } else if (sql.includes('UPDATE rider_status_actions')) {
      const [stateOrError, errorMessage, , operationId] = params;
      const row = this.statusActions.get(operationId);
      if (row) {
        row.state = stateOrError;
        row.last_error = errorMessage ?? null;
        row.updated_at = Date.now();
      }
    }
    this.persist();
    return { changes: 1 };
  }

  async getAllAsync(sql: string, params: any[] = []) {
    if (sql.includes('FROM location_outbox')) {
      if (sql.includes('last_error')) return this.locationOutbox
        .filter((row) => row.rider_id === params[0] && ['pending', 'rejected'].includes(row.status))
        .map((row) => ({ status: row.status, last_error: row.last_error, created_at: row.created_at }));
      const limit = Number(params[params.length - 1] || 50);
      return this.locationOutbox
        .filter((row) => row.rider_id === params[0] && row.status === 'pending')
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, limit)
        .map((row) => ({ payload: row.payload }));
    }
    if (sql.includes('FROM sync_queue')) {
      if (sql.includes('last_error')) return this.syncQueue.filter((row) => row.endpoint === '/api/users/location' && ['pending', 'failed'].includes(row.status));
      return this.syncQueue.filter((row) => row.status === 'pending');
    }
    if (sql.includes('FROM rider_status_actions')) {
      const riderId = params[0];
      const requestId = sql.includes('request_id = ?') ? params[1] : undefined;
      return [...this.statusActions.values()].filter((row) => row.rider_id === riderId && (!requestId || row.request_id === requestId)).sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }

  async getFirstAsync(sql: string, params: any[] = []) {
    if (sql.includes('FROM tasks_cache')) return this.tasksCache.get(String(params[0] ?? 'active_tasks')) || null;
    if (sql.includes('FROM rider_status_actions')) return this.statusActions.get(String(params[0] ?? '')) || null;
    return null;
  }
}

let db: WebDatabase | null = null;

export const getDb = async () => {
  if (!db) db = new WebDatabase();
  return db;
};

export const clearCache = async () => {
  db = new WebDatabase();
  if (typeof localStorage !== 'undefined') localStorage.removeItem('rrs_local_db_v1');
};
