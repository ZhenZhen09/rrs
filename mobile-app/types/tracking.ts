export type TrackingSessionStatus = 'active' | 'ending' | 'ended';

export interface TrackingSession {
  sessionId: string;
  requestId: string;
  riderId: string;
  startedAt: number;
  status: TrackingSessionStatus;
  lastSequence: number;
}

export interface LocationEvent {
  eventId: string;
  sessionId: string;
  requestId: string;
  riderId: string;
  sequence: number;
  capturedAt: number;
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  heading?: number | null;
  batteryLevel?: number;
  networkType?: string | null;
}

export interface LocationBatchResponse {
  acceptedEventIds: string[];
  rejected: { eventId: string; reason: string }[];
  latestServerSequence?: number;
}

export const createLocationEventId = (sessionId: string, sequence: number) =>
  `${sessionId}:${sequence}`;

export const isValidLocationEvent = (event: LocationEvent, now = Date.now()) => {
  if (!event.eventId || !event.sessionId || !event.requestId || !event.riderId) return false;
  if (!Number.isInteger(event.sequence) || event.sequence < 1) return false;
  if (!Number.isFinite(event.capturedAt) || event.capturedAt > now + 30_000) return false;
  if (!Number.isFinite(event.latitude) || event.latitude < -90 || event.latitude > 90) return false;
  if (!Number.isFinite(event.longitude) || event.longitude < -180 || event.longitude > 180) return false;
  if (event.latitude === 0 && event.longitude === 0) return false;
  if (event.accuracyM !== undefined && event.accuracyM !== null && (!Number.isFinite(event.accuracyM) || event.accuracyM < 0)) return false;
  return true;
};
