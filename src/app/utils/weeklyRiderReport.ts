import { getWeeklyResolutionDetails } from './weeklySchedule';

export type WeeklyReportOutcome = 'Completed' | 'Failed' | 'Cancelled' | 'Open';

export interface WeeklyReportTask {
  request_id?: string;
  assigned_rider_id?: string | null;
  assigned_rider_name?: string | null;
  delivery_status?: string | null;
  status?: string | null;
  overdue_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  delivery_date?: string | null;
  time_window?: string | null;
  dropoff_building_name?: string | null;
  dropoff_address?: string | null;
  overdue_minutes_at_resolution?: number | null;
  [key: string]: unknown;
}

export interface WeeklyRiderReportRow {
  riderId: string;
  riderName: string;
  tasks: WeeklyReportTask[];
  assigned: number;
  completed: number;
  failed: number;
  cancelled: number;
  open: number;
  overdue: number;
  onTimeRate: number;
  averageCompletionMinutes: number | null;
}

export interface WeeklyReportSummary {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  open: number;
  overdue: number;
  onTimeRate: number;
}

const getOutcome = (task: WeeklyReportTask): WeeklyReportOutcome => (
  getWeeklyResolutionDetails(task).outcome
);

const getCompletionMinutes = (task: WeeklyReportTask) => {
  if (!task.started_at || !task.finished_at) return null;
  const minutes = (new Date(task.finished_at).getTime() - new Date(task.started_at).getTime()) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
};

const getRiderKey = (task: WeeklyReportTask) => task.assigned_rider_id || 'unassigned';

const getRiderName = (task: WeeklyReportTask) => task.assigned_rider_name || 'Unassigned';

export function buildWeeklyRiderReport(tasks: WeeklyReportTask[]): WeeklyRiderReportRow[] {
  const grouped = new Map<string, WeeklyRiderReportRow>();

  tasks.forEach((task) => {
    const riderId = getRiderKey(task);
    const existing = grouped.get(riderId) || {
      riderId,
      riderName: getRiderName(task),
      tasks: [],
      assigned: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      open: 0,
      overdue: 0,
      onTimeRate: 0,
      averageCompletionMinutes: null,
    };
    const outcome = getOutcome(task);
    existing.tasks.push(task);
    existing.assigned += 1;
    if (outcome === 'Completed') existing.completed += 1;
    if (outcome === 'Failed') existing.failed += 1;
    if (outcome === 'Cancelled') existing.cancelled += 1;
    if (outcome === 'Open') existing.open += 1;
    if (task.overdue_at) existing.overdue += 1;
    grouped.set(riderId, existing);
  });

  return Array.from(grouped.values())
    .map((row) => {
      const completedOnTime = row.tasks.filter((task) => getOutcome(task) === 'Completed' && !task.overdue_at).length;
      const durations = row.tasks.map(getCompletionMinutes).filter((value): value is number => value !== null);
      return {
        ...row,
        onTimeRate: row.completed ? Math.round((completedOnTime / row.completed) * 100) : 0,
        averageCompletionMinutes: durations.length
          ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
          : null,
      };
    })
    .sort((a, b) => a.riderName.localeCompare(b.riderName));
}

export function getWeeklyReportSummary(tasks: WeeklyReportTask[]): WeeklyReportSummary {
  const rows = buildWeeklyRiderReport(tasks);
  const summary = rows.reduce<WeeklyReportSummary>((total, row) => ({
    total: total.total + row.assigned,
    completed: total.completed + row.completed,
    failed: total.failed + row.failed,
    cancelled: total.cancelled + row.cancelled,
    open: total.open + row.open,
    overdue: total.overdue + row.overdue,
    onTimeRate: 0,
  }), { total: 0, completed: 0, failed: 0, cancelled: 0, open: 0, overdue: 0, onTimeRate: 0 });
  const completedOnTime = tasks.filter((task) => getOutcome(task) === 'Completed' && !task.overdue_at).length;
  return { ...summary, onTimeRate: summary.completed ? Math.round((completedOnTime / summary.completed) * 100) : 0 };
}

export const getWeeklyTaskOutcome = getOutcome;
