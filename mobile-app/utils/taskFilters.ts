import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';

export type RiderTaskTab = 'today' | 'overdue' | 'tomorrow' | 'future' | 'hidden';

export const TERMINAL_DELIVERY_STATUSES = ['completed', 'delivered', 'failed', 'cancelled'];

export const isActiveApprovedTask = (task: Job): boolean => {
  return task.status === 'approved' && !TERMINAL_DELIVERY_STATUSES.includes(task.delivery_status);
};

/**
 * Global Sequence Enforcement Logic
 * A task is locked if there's any task with a lower queue_order that isn't 'in_progress' or terminal.
 */
export const isTaskLocked = (currentTask: Job, allTasks: Job[]): boolean => {
  // If the task itself is already in progress, it's never locked
  if (currentTask.delivery_status === 'in_progress') return false;

  const currentOrder = currentTask.queue_order || 999;

  return allTasks.some(t => {
    // Only check tasks that are actually supposed to be visible to the rider
    if (!isActiveApprovedTask(t)) return false;

    const otherOrder = t.queue_order || 999;
    
    // We only care about tasks earlier in the sequence
    if (otherOrder < currentOrder) {
      // If an earlier task is not finished and not currently being worked on, it blocks this one
      const isTerminal = TERMINAL_DELIVERY_STATUSES.includes(t.delivery_status);
      const isInProgress = t.delivery_status === 'in_progress';
      
      if (!isTerminal && !isInProgress) {
        return true;
      }
    }
    return false;
  });
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
