import { api } from '@/utils/api';
import { AuthManager } from '@/utils/AuthManager';
import {
  acknowledgeLocationEvents,
  getPendingLocationEvents,
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

    const events = await getPendingLocationEvents(user.id, 50);
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
        // Rejected GPS samples cannot become valid by retrying them later.
        // Discard them so an offline backlog cannot accumulate forever.
        await acknowledgeLocationEvents((rejected as Array<{ eventId: string }>).map((item) => item.eventId));
      }

      return { accepted: accepted.length, rejected: rejected.length };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status >= 400 && status < 500 && status !== 429) {
        // Permanent client errors are not retryable GPS samples.
        await acknowledgeLocationEvents(riderEvents.map((event) => event.eventId));
        return { accepted: 0, rejected: riderEvents.length };
      }
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
