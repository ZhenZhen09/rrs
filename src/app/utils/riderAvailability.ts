export interface RiderAvailabilityInput {
  attendance_status?: 'present' | 'absent' | 'on_leave' | null;
  is_on_duty?: boolean;
  is_online?: boolean;
}

export type RiderAvailability = {
  eligible: boolean;
  blockReason?: 'ON LEAVE' | 'ABSENT' | 'OFF-DUTY' | 'OFFLINE';
  notice?: 'NO REPORT';
};

export function isScheduledForToday(deliveryDate?: string, now = new Date()): boolean {
  if (!deliveryDate) return false;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const currentDay = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
  return deliveryDate.slice(0, 10) === currentDay;
}

export function resolveRiderOnlineState(
  socketState: 'online' | 'offline' | undefined,
  apiOnline?: boolean,
): boolean {
  if (socketState === 'online') return true;
  if (socketState === 'offline') return false;
  return Boolean(apiOnline);
}

export function getRiderAvailability(rider: RiderAvailabilityInput, isSameDay: boolean): RiderAvailability {
  if (!isSameDay) return { eligible: true };
  const notice = rider.attendance_status ? undefined : 'NO REPORT';
  const blocked = (blockReason: NonNullable<RiderAvailability['blockReason']>): RiderAvailability => ({
    eligible: false, blockReason, ...(notice ? { notice } : {}),
  });
  if (rider.attendance_status === 'on_leave') return blocked('ON LEAVE');
  if (rider.attendance_status === 'absent') return blocked('ABSENT');
  if (!rider.is_on_duty) return blocked('OFF-DUTY');
  if (!rider.is_online) return blocked('OFFLINE');
  return notice ? { eligible: true, notice } : { eligible: true };
}
