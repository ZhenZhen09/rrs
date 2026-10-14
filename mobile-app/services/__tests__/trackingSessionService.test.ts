import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginTrackingSession, getTrackingSession, endTrackingSession, nextLocationSequence, createLocationEvent } from '../trackingSessionService';

describe('tracking session service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('restores the same active session after repeated initialization', async () => {
    const first = await beginTrackingSession('request-1', 'rider-1');
    const second = await beginTrackingSession('request-1', 'rider-1');

    expect(second).toEqual(first);
    await expect(getTrackingSession()).resolves.toEqual(first);
  });

  it('increments location sequences durably', async () => {
    await beginTrackingSession('request-1', 'rider-1');
    await expect(nextLocationSequence()).resolves.toBe(1);
    await expect(nextLocationSequence()).resolves.toBe(2);
  });

  it('clears the active session when tracking ends', async () => {
    await beginTrackingSession('request-1', 'rider-1');
    await endTrackingSession();

    await expect(getTrackingSession()).resolves.toBeNull();
  });

  it('creates a location event with the next durable sequence', async () => {
    await beginTrackingSession('request-1', 'rider-1');
    await expect(createLocationEvent({ latitude: 14.5, longitude: 120.9, capturedAt: 1_700_000_000_000 })).resolves.toEqual(
      expect.objectContaining({ sequence: 1, requestId: 'request-1', riderId: 'rider-1' }),
    );
  });
});
