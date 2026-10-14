import { api } from '@/utils/api';
import { AuthManager } from '@/utils/AuthManager';
import {
  acknowledgeLocationEvents,
  getPendingLocationEvents,
  markLocationEventsRejected,
  markLocationEventsForRetry,
} from './locationOutbox';

export type LocationSyncTrigger = 'startup' | 'network_recovered' | 'foreground' | 'background_event' | 'status_update';

let isFlushing = false;

export const flushLocationOutbox = async (trigger: LocationSyncTrigger) => {
  if (isFlushing) return { accepted: 0, rejected: 0 };
  isFlushing = true;

  try {
    const [token, user] = await Promise.all([
      AuthManager.getValidToken(),
      AuthManager.getUserData(),
    ]);
    if (!token || !user?.id) return { accepted: 0, rejected: 0 };

    const events = await getPendingLocationEvents(50);
    if (events.length === 0) return { accepted: 0, rejected: 0 };

    const riderEvents = events.filter((event) => event.riderId === user.id);
    if (riderEvents.length === 0) return { accepted: 0, rejected: 0 };

    try {
      const response = await api.post('/api/users/location/batch', {
        sessionId: riderEvents[0].sessionId,
        trigger,
        events: riderEvents,
      }, { timeout: 15_000 });
      const accepted = response.data?.acceptedEventIds || [];
      const rejected = response.data?.rejected || [];

      await acknowledgeLocationEvents(accepted);
      if (rejected.length > 0) {
        await markLocationEventsRejected(
          rejected.map((item: { eventId: string }) => item.eventId),
          rejected.map((item: { reason: string }) => item.reason).join(', '),
        );
      }

      return { accepted: accepted.length, rejected: rejected.length };
    } catch (error: any) {
      await markLocationEventsForRetry(
          riderEvents.map((event) => event.eventId),
        error?.message || 'location sync failed',
      );
      return { accepted: 0, rejected: 0 };
    }
  } finally {
    isFlushing = false;
  }
};
