const PHILIPPINE_TIME_ZONE = 'Asia/Manila';
const OVERDUE_CUTOFF_HOUR = 19;
const TERMINAL_DELIVERY_STATUSES = new Set(['completed', 'delivered', 'failed', 'cancelled']);

export type ProactiveOverdueState = 'Normal' | 'At Risk' | 'Overdue';

const parseDeliveryDateOnly = (value: unknown) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value.slice(0, 10) : '');
  if (!match) return null;
  const [, year, month, day] = match;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};

export const getOverdueWarningThresholdMinutes = () => {
  const value = Number(process.env.OVERDUE_WARNING_THRESHOLD_MINUTES ?? 30);
  return Number.isFinite(value) && value >= 1 && value <= 1440 ? Math.floor(value) : 30;
};

export const getScheduledEndAt = (deliveryDate: unknown, timeWindow: unknown): string | null => {
  const date = parseDeliveryDateOnly(deliveryDate);
  const windowText = typeof timeWindow === 'string' ? timeWindow.trim() : '';
  const match = /(?:^|-)\s*(\d{1,2}):(\d{2})\s*(?:AM|PM)?\s*$/i.exec(windowText);
  if (!date || !match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const hasMeridiem = /(?:AM|PM)\s*$/i.test(windowText);
  if (minute > 59 || (hasMeridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (hasMeridiem) {
    const meridiem = /PM\s*$/i.test(windowText);
    hour = (hour % 12) + (meridiem ? 12 : 0);
  }
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
};

export const getProactiveOverdueMetadata = (
  request: { delivery_date?: unknown; time_window?: unknown; scheduled_end_at?: unknown; status?: string | null; delivery_status?: string | null },
  now = new Date(),
  warningThresholdMinutes = getOverdueWarningThresholdMinutes(),
) => {
  const computedDeadline = getScheduledEndAt(request.delivery_date, request.time_window);
  const storedDeadline = typeof request.scheduled_end_at === 'string' && request.scheduled_end_at.trim()
    ? request.scheduled_end_at.replace(' ', 'T') + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(request.scheduled_end_at) ? '' : '+08:00')
    : null;
  const scheduledEndAt = computedDeadline || storedDeadline;
  const terminalStatuses = new Set(['completed', 'delivered', 'failed', 'cancelled', 'disapproved']);
  const isTerminal = terminalStatuses.has(String(request.delivery_status || '').toLowerCase())
    || terminalStatuses.has(String(request.status || '').toLowerCase());
  const deadlineMs = scheduledEndAt ? Date.parse(scheduledEndAt) : NaN;
  const delta = deadlineMs - now.getTime();
  const overdue = !isTerminal && Number.isFinite(deadlineMs) && delta < 0;
  const remaining = !isTerminal && Number.isFinite(deadlineMs) && delta >= 0 ? Math.ceil(delta / 60000) : 0;
  const overdueMinutes = overdue ? Math.max(1, Math.ceil(-delta / 60000)) : 0;
  const threshold = Number.isFinite(warningThresholdMinutes) && warningThresholdMinutes >= 0 ? warningThresholdMinutes : 30;
  const atRisk = !isTerminal && Number.isFinite(deadlineMs) && !overdue && remaining <= threshold;
  return {
    scheduled_end_at: scheduledEndAt,
    state: overdue ? 'Overdue' as const : atRisk ? 'At Risk' as const : 'Normal' as const,
    remaining_minutes: remaining,
    overdue_minutes: overdueMinutes,
    is_overdue: overdue,
  };
};

export type OverdueAction = 'contact_rider' | 'track_rider' | 'check_signal';

export interface OverdueMetadata {
  is_overdue: boolean;
  overdue_minutes: number;
  overdue_label: string;
  overdue_reason: 'past_due' | 'end_of_day' | null;
  recommended_action: OverdueAction | null;
}

const getPhilippineParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value || NaN);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
};

const parseDeliveryDate = (value: unknown) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value.slice(0, 10) : '');
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

const formatOverdueLabel = (minutes: number) => {
  if (minutes === 0) return 'Overdue now';
  if (minutes < 60) return `${minutes}m overdue`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h overdue` : `${hours}h ${remainingMinutes}m overdue`;
};

export const getOverdueMetadata = (request: {
  delivery_date?: unknown;
  time_window?: unknown;
  scheduled_end_at?: unknown;
  status?: string | null;
  delivery_status?: string | null;
  assigned_rider_id?: string | null;
  exceptions?: string[] | null;
}, now = new Date()): OverdueMetadata => {
  const neutral: OverdueMetadata = { is_overdue: false, overdue_minutes: 0, overdue_label: '', overdue_reason: null, recommended_action: null };
  if (String(request.status || '').toLowerCase() !== 'approved') return neutral;
  if (!request.assigned_rider_id) return neutral;
  if (TERMINAL_DELIVERY_STATUSES.has(String(request.delivery_status || '').toLowerCase())) return neutral;
  if (request.time_window) {
    const proactive = getProactiveOverdueMetadata(request, now);
    const recommended_action: OverdueAction = request.exceptions?.includes('signal_lost')
      ? 'check_signal'
      : request.delivery_status === 'in_progress' ? 'track_rider' : 'contact_rider';
    return {
      is_overdue: proactive.is_overdue,
      overdue_minutes: proactive.overdue_minutes,
      overdue_label: proactive.is_overdue ? formatOverdueLabel(proactive.overdue_minutes) : '',
      overdue_reason: proactive.is_overdue ? 'past_due' : null,
      recommended_action: proactive.is_overdue ? recommended_action : null,
    };
  }
  const deliveryDate = parseDeliveryDate(request.delivery_date);
  if (!deliveryDate) return neutral;

  const current = getPhilippineParts(now);
  const currentCalendar = Date.UTC(current.year, current.month - 1, current.day);
  const deliveryCalendar = Date.UTC(deliveryDate.year, deliveryDate.month - 1, deliveryDate.day);
  const cutoff = Date.UTC(deliveryDate.year, deliveryDate.month - 1, deliveryDate.day, OVERDUE_CUTOFF_HOUR);
  const isPastDate = deliveryCalendar < currentCalendar;
  const isSameDayAfterCutoff = deliveryCalendar === currentCalendar && current.hour >= OVERDUE_CUTOFF_HOUR;
  if (!isPastDate && !isSameDayAfterCutoff) return neutral;

  const elapsedMinutes = Math.max(0, Math.floor((Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute) - cutoff) / 60000));
  const recommended_action: OverdueAction = request.exceptions?.includes('signal_lost')
    ? 'check_signal'
    : request.delivery_status === 'in_progress' ? 'track_rider' : 'contact_rider';

  return {
    is_overdue: true,
    overdue_minutes: elapsedMinutes,
    overdue_label: formatOverdueLabel(elapsedMinutes),
    overdue_reason: isPastDate ? 'past_due' : 'end_of_day',
    recommended_action,
  };
};
