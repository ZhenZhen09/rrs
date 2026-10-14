import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocationEventId, LocationEvent, TrackingSession } from '../types/tracking';

const SESSION_KEY = '@tracking_session';
const SEQUENCE_KEY = '@tracking_sequence';

const createSessionId = () => {
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return cryptoObject?.randomUUID
    ? cryptoObject.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const beginTrackingSession = async (requestId: string, riderId: string): Promise<TrackingSession> => {
  const existing = await getTrackingSession();
  if (existing?.requestId === requestId && existing.riderId === riderId && existing.status === 'active') {
    return existing;
  }

  const session: TrackingSession = {
    sessionId: createSessionId(),
    requestId,
    riderId,
    startedAt: Date.now(),
    status: 'active',
    lastSequence: 0,
  };
  await AsyncStorage.multiSet([
    [SESSION_KEY, JSON.stringify(session)],
    [SEQUENCE_KEY, '0'],
  ]);
  return session;
};

export const getTrackingSession = async (): Promise<TrackingSession | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrackingSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const nextLocationSequence = async () => {
  const current = Number(await AsyncStorage.getItem(SEQUENCE_KEY) || '0');
  const next = current + 1;
  await AsyncStorage.setItem(SEQUENCE_KEY, String(next));
  const session = await getTrackingSession();
  if (session) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, lastSequence: next }));
  }
  return next;
};

export const endTrackingSession = async () => {
  await AsyncStorage.multiRemove([SESSION_KEY, SEQUENCE_KEY]);
};

export const createLocationEvent = async (input: {
  latitude: number;
  longitude: number;
  capturedAt: number;
  accuracyM?: number | null;
  heading?: number | null;
  batteryLevel?: number;
  networkType?: string | null;
}): Promise<LocationEvent> => {
  const session = await getTrackingSession();
  if (!session || session.status !== 'active') throw new Error('No active tracking session');
  const sequence = await nextLocationSequence();
  return {
    eventId: createLocationEventId(session.sessionId, sequence),
    sessionId: session.sessionId,
    requestId: session.requestId,
    riderId: session.riderId,
    sequence,
    capturedAt: input.capturedAt,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyM: input.accuracyM,
    heading: input.heading,
    batteryLevel: input.batteryLevel,
    networkType: input.networkType,
  };
};
