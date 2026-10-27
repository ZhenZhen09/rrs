type WebDatabaseModule = typeof import('../localDb.web');

const storage = new Map<string, string>();
let databaseModule: WebDatabaseModule;

describe('web local database startup recovery', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    storage.set('rrs_local_db_v1', JSON.stringify({
      locationOutbox: [],
      syncQueue: [
        { id: 1, endpoint: '/api/requests/request-1/status', status: 'syncing', payload: '{}', created_at: 1 },
        { id: 2, endpoint: '/api/users/location', status: 'syncing', payload: '{"riderId":"rider-A"}', created_at: 2 },
      ],
      tasksCache: [],
      statusActions: [['op-1', {
        operation_id: 'op-1', rider_id: 'rider-A', request_id: 'request-1', status: 'completed',
        remark: '', timestamp: '2026-10-21T08:00:00Z', state: 'syncing', created_at: 1,
      }]],
    }));
    jest.isolateModules(() => {
      databaseModule = jest.requireActual('../localDb.web') as WebDatabaseModule;
    });
  });

  it('recovers interrupted rows and quarantines legacy status updates without deleting them', async () => {
    const database = await databaseModule.getDb();
    const actions = await database.getAllAsync('SELECT * FROM rider_status_actions WHERE rider_id=?', ['rider-A']);
    const pendingQueue = await database.getAllAsync("SELECT * FROM sync_queue WHERE status='pending'");
    const savedState = JSON.parse(storage.get('rrs_local_db_v1') || '{}');

    expect(actions).toEqual([expect.objectContaining({ operation_id: 'op-1', state: 'pending' })]);
    expect(pendingQueue).toEqual([expect.objectContaining({ id: 2, status: 'pending' })]);
    expect(savedState.syncQueue).toEqual([
      expect.objectContaining({ id: 1, status: 'failed', last_error: 'Legacy rider status action requires review' }),
      expect.objectContaining({ id: 2, status: 'pending' }),
    ]);
  });
});
