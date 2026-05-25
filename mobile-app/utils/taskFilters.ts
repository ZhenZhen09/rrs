import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';

export type RiderTaskTab = 'today' | 'overdue' | 'tomorrow' | 'future' | 'hidden';

export const TERMINAL_DELIVERY_STATUSES = ['completed', 'delivered', 'failed', 'cancelled'];

export const isActiveApprovedTask = (task: Job): boolean => {
  return task.status === 'approved' && !TERMINAL_DELIVERY_STATUSES.includes(task.delivery_status);
};

const isPastTimeWindow = (timeWindow: string | undefined, now: Date): boolean => {
  const parts = (timeWindow || '').split('-');
  if (parts.length !== 2) return false;

  const [endHour, endMinute] = parts[1].trim().split(':').map(Number);
  if (isNaN(endHour) || isNaN(endMinute)) return false;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  return currentHour > endHour || (currentHour === endHour && currentMinute > endMinute);
};

export const getRiderTaskTab = (task: Job, today: Date = new Date()): RiderTaskTab => {
  if (!isActiveApprovedTask(task)) return 'hidden';

  const todayStr = getLocalDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);
  const deliveryDate = getLocalDateStr(task.delivery_date);

  if (deliveryDate < todayStr) return 'overdue';
  if (deliveryDate === todayStr) {
    return isPastTimeWindow(task.time_window, today) ? 'overdue' : 'today';
  }
  if (deliveryDate === tomorrowStr) return 'tomorrow';
  return 'future';
};

export const getRiderTaskCounts = (tasks: Job[], today: Date = new Date()) => {
  return tasks.reduce((acc, task) => {
    const tab = getRiderTaskTab(task, today);
    if (tab === 'today') acc.today += 1;
    if (tab === 'overdue') acc.overdue += 1;
    return acc;
  }, { today: 0, overdue: 0 });
};
