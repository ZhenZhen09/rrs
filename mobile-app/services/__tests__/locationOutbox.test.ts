jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import { appendLocationEvent, getPendingLocationEvents, acknowledgeLocationEvents, markLocationEventsRejected } from '../locationOutbox';
import { getDb } from '../localDb';
import type { LocationEvent } from '../../types/tracking';

jest.mock('../localDb');

const event: LocationEvent = {
  eventId: 'session-1:1',
  sessionId: 'session-1',
  requestId: 'request-1',
  riderId: 'rider-1',
  sequence: 1,
  capturedAt: 1_700_000_000_000,
  latitude: 14.5995,
  longitude: 120.9842,
};

describe('location outbox', () => {
  const db = {
    runAsync: jest.fn().mockResolvedValue({}),
    getAllAsync: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockResolvedValue(db);
  });

  it('persists a location event before network synchronization', async () => {
    await appendLocationEvent(event);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO location_outbox'),
      expect.arrayContaining(['session-1:1', 'session-1', 'request-1', 'rider-1', 1]),
    );
  });

  it('returns pending events in sequence order', async () => {
    db.getAllAsync.mockResolvedValue([{ event_id: event.eventId, payload: JSON.stringify(event) }]);

    await expect(getPendingLocationEvents('rider-1', 10)).resolves.toEqual([event]);
    expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining("status = 'pending'"), ['rider-1', 10]);
    expect(db.getAllAsync.mock.calls[0][0]).not.toContain('expires_at');
  });

  it('keeps old queued coordinates selectable after the retention window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T00:00:00.000Z'));
    db.getAllAsync.mockResolvedValue([{ payload: JSON.stringify(event) }]);
    jest.setSystemTime(new Date('2026-10-24T01:00:00.000Z'));

    await expect(getPendingLocationEvents('rider-1')).resolves.toEqual([event]);
    jest.useRealTimers();
  });

  it('acknowledges only the supplied event IDs', async () => {
    await acknowledgeLocationEvents(['session-1:1']);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM location_outbox'),
      ['session-1:1'],
    );
  });

  it('marks permanently rejected events so they are not retried forever', async () => {
    await markLocationEventsRejected(['session-1:1'], 'stale_location');

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'rejected'"),
      ['stale_location', 'session-1:1'],
    );
  });
});
