import {
  createLocationEventId,
  isValidLocationEvent,
  LocationEvent,
} from '../tracking';

const makeEvent = (overrides: Partial<LocationEvent> = {}): LocationEvent => ({
  eventId: 'session-1:1',
  sessionId: 'session-1',
  requestId: 'request-1',
  riderId: 'rider-1',
  sequence: 1,
  capturedAt: 1_700_000_000_000,
  latitude: 14.5995,
  longitude: 120.9842,
  ...overrides,
});

describe('tracking event contract', () => {
  it('creates stable event IDs from a session and sequence', () => {
    expect(createLocationEventId('session-1', 7)).toBe('session-1:7');
  });

  it('accepts a valid location event', () => {
    expect(isValidLocationEvent(makeEvent(), 1_700_000_001_000)).toBe(true);
  });

  it('rejects invalid coordinates and future timestamps', () => {
    expect(isValidLocationEvent(makeEvent({ latitude: 95 }), 1_700_000_001_000)).toBe(false);
    expect(isValidLocationEvent(makeEvent({ capturedAt: 1_700_000_100_000 }), 1_700_000_001_000)).toBe(false);
  });

  it('rejects non-positive sequence numbers', () => {
    expect(isValidLocationEvent(makeEvent({ sequence: 0 }), 1_700_000_001_000)).toBe(false);
  });
});
