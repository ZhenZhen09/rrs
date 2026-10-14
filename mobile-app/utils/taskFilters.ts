import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';

export type RiderTaskTab = 'today' | 'overdue' | 'tomorrow' | 'future' | 'hidden';

export const TERMINAL_DELIVERY_STATUSES = ['completed', 'delivered', 'failed', 'cancelled'];

export const isActiveApprovedTask = (task: Job): boolean => {
  return task.status === 'approved'
    && (typeof task.delivery_status === 'string' || typeof task.is_overdue === 'boolean')
    && !TERMINAL_DELIVERY_STATUSES.includes(task.delivery_status || '');
};

/**
 * Global Sequence Enforcement Logic
 * A task is locked if there's any task with a lower queue_order that isn't 'in_progress' or terminal.
 */
export const isTaskLocked = (currentTask: Job, allTasks: Job[]): boolean => {
  // If the task itself is already in progress, it's never locked
  if (currentTask.delivery_status === 'in_progress') return false;

  return allTasks.some(t => {
    // Only check tasks that are actually supposed to be visible to the rider
    if (!isActiveApprovedTask(t)) return false;

    // queue_order is the dispatcher's authoritative rider-wide route sequence.
    const isEarlier = compareRiderQueueTasks(t, currentTask) < 0;

    if (isEarlier) {
      // If an earlier task is not finished and not currently being worked on, it blocks this one
      const isTerminal = TERMINAL_DELIVERY_STATUSES.includes(t.delivery_status || '');
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
  if (!task?.request_id || !task?.status) {
    return 'hidden';
  }

  if (!isActiveApprovedTask(task)) return 'hidden';

  const todayStr = getLocalDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);
  const deliveryDate = getLocalDateStr(task.delivery_date || '');

  // The API is the source of truth. Keep the local rule only for cached or legacy records.
  if (typeof task.is_overdue === 'boolean') {
    if (task.is_overdue) return 'overdue';
    if (deliveryDate > tomorrowStr) return 'future';
    if (deliveryDate === tomorrowStr) return 'tomorrow';
    return 'today';
  }

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
    if (tab === 'tomorrow' || tab === 'future') acc.upcoming += 1;
    return acc;
  }, { today: 0, overdue: 0, upcoming: 0 });
};

export const getRiderTasksForTab = (tasks: Job[], tab: RiderTaskTab, today: Date = new Date()): Job[] => {
  return tasks
    .filter(task => {
      const taskTab = getRiderTaskTab(task, today);
      return tab === 'tomorrow'
        ? taskTab === 'tomorrow' || taskTab === 'future'
        : taskTab === tab;
    })
    .sort(compareRiderQueueTasks);
};

export const compareRiderQueueTasks = (a: Job, b: Job): number => {
  const orderA = a.queue_order && a.queue_order > 0 ? a.queue_order : Number.MAX_SAFE_INTEGER;
  const orderB = b.queue_order && b.queue_order > 0 ? b.queue_order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  const createdAtOrder = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  if (createdAtOrder !== 0) return createdAtOrder;
  return String(a.request_id).localeCompare(String(b.request_id));
};

export const getRiderTaskSequenceLabel = (task: Job, allTasks: Job[]): string => {
  const activeQueue = allTasks.filter(isActiveApprovedTask).sort(compareRiderQueueTasks);
  const index = activeQueue.findIndex(item => String(item.request_id) === String(task.request_id));
  const position = index < 0 ? 1 : index + 1;
  return `STOP ${position} OF ${Math.max(1, activeQueue.length)}`;
};
