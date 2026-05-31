import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';

export type RiderTaskTab = 'today' | 'overdue' | 'tomorrow' | 'future' | 'hidden';

export const TERMINAL_DELIVERY_STATUSES = ['completed', 'delivered', 'failed', 'cancelled'];

export const isActiveApprovedTask = (task: Job): boolean => {
  return task.status === 'approved' && !TERMINAL_DELIVERY_STATUSES.includes(task.delivery_status);
};

export const getRiderTaskTab = (task: Job, today: Date = new Date()): RiderTaskTab => {
  // Defensive: Fail-Hidden logic for missing critical fields (Enterprise Hardening)
  if (!task?.request_id || !task?.status || !task?.delivery_status) {
    return 'hidden';
  }

  if (!isActiveApprovedTask(task)) return 'hidden';

  const todayStr = getLocalDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);
  const deliveryDate = getLocalDateStr(task.delivery_date);

  if (deliveryDate < todayStr) return 'overdue';
  if (deliveryDate === todayStr) {
    // BUSINESS RULE: Tasks scheduled for today move to "Overdue" strictly at 7:00 PM (19:00)
    return today.getHours() >= 19 ? 'overdue' : 'today';
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
