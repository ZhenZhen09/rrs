jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@/utils/AuthManager', () => ({
  AuthManager: { getValidToken: jest.fn(), getUserData: jest.fn() },
}));

import { flushLocationOutbox } from '../locationSyncService';
import { getPendingLocationEvents, acknowledgeLocationEvents, markLocationEventsForRetry } from '../locationOutbox';
import { api } from '@/utils/api';
import { AuthManager } from '@/utils/AuthManager';
import type { LocationEvent } from '../../types/tracking';

jest.mock('../locationOutbox');
jest.mock('@/utils/api');

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

describe('location sync service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthManager.getValidToken as jest.Mock).mockResolvedValue('valid-token');
    (AuthManager.getUserData as jest.Mock).mockResolvedValue({ id: 'rider-1' });
    (getPendingLocationEvents as jest.Mock).mockResolvedValue([event]);
  });

  it('does not send queued location events without an authenticated rider session', async () => {
    (AuthManager.getValidToken as jest.Mock).mockResolvedValue(null);

    await expect(flushLocationOutbox('network_recovered')).resolves.toEqual({ accepted: 0, rejected: 0 });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not send one rider’s queued location events under another rider’s session', async () => {
    (AuthManager.getUserData as jest.Mock).mockResolvedValue({ id: 'rider-2' });

    await expect(flushLocationOutbox('network_recovered')).resolves.toEqual({ accepted: 0, rejected: 0 });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('acknowledges events returned by the batch endpoint', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { acceptedEventIds: [event.eventId], rejected: [] } });

    await expect(flushLocationOutbox('network_recovered')).resolves.toEqual({ accepted: 1, rejected: 0 });
    expect(acknowledgeLocationEvents).toHaveBeenCalledWith([event.eventId]);
  });

  it('keeps events pending when the batch request fails', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(flushLocationOutbox('startup')).resolves.toEqual({ accepted: 0, rejected: 0 });
    expect(markLocationEventsForRetry).toHaveBeenCalledWith([event.eventId], 'offline');
  });
});
