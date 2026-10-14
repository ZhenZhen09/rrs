type WebRow = Record<string, any>;

class WebDatabase {
  private locationOutbox: WebRow[] = [];
  private syncQueue: WebRow[] = [];
  private tasksCache = new Map<string, WebRow>();

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
    } else if (sql.includes('INSERT OR REPLACE INTO tasks_cache')) {
      const [id, data, updated_at] = params;
      this.tasksCache.set(id, { id, data, updated_at });
    }
    return { changes: 1 };
  }

  async getAllAsync(sql: string, params: any[] = []) {
    if (sql.includes('FROM location_outbox')) {
      const limit = Number(params[params.length - 1] || 50);
      return this.locationOutbox
        .filter((row) => row.status === 'pending' && row.expires_at > Date.now())
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, limit)
        .map((row) => ({ payload: row.payload }));
    }
    if (sql.includes('FROM sync_queue')) return this.syncQueue.filter((row) => row.status === 'pending');
    return [];
  }

  async getFirstAsync(sql: string) {
    if (sql.includes('FROM tasks_cache')) return this.tasksCache.get('active_tasks') || null;
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
};
