jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import { openDatabaseAsync } from 'expo-sqlite';
import { getDb } from '../localDb';

describe('local SQLite outbox recovery', () => {
  const database = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (openDatabaseAsync as jest.Mock).mockResolvedValue(database);
  });

  it('recovers interrupted status writes and quarantines unowned legacy status rows without deleting them', async () => {
    await getDb();

    expect(database.runAsync).toHaveBeenCalledWith("UPDATE rider_status_actions SET state='pending' WHERE state='syncing'");
    expect(database.runAsync).toHaveBeenCalledWith("UPDATE sync_queue SET status='pending' WHERE status='syncing'");
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_queue SET status='failed', last_error='Legacy rider status action requires review'"),
    );
    expect(database.runAsync.mock.calls[2][0]).toContain("endpoint LIKE '/api/requests/%/status'");
  });
});
