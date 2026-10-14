import { describe, expect, it } from 'vitest';
import { buildWeeklyRiderReport, getWeeklyReportSummary } from '../weeklyRiderReport';

const tasks = [
  {
    request_id: 'completed-on-time',
    assigned_rider_id: 'rider-1',
    assigned_rider_name: 'Rider One',
    delivery_status: 'completed',
    started_at: '2026-10-05T09:00:00Z',
    finished_at: '2026-10-05T09:30:00Z',
  },
  {
    request_id: 'completed-late',
    assigned_rider_id: 'rider-1',
    assigned_rider_name: 'Rider One',
    delivery_status: 'completed',
    overdue_at: '2026-10-05T09:45:00Z',
    started_at: '2026-10-05T09:30:00Z',
    finished_at: '2026-10-05T10:30:00Z',
  },
  {
    request_id: 'failed',
    assigned_rider_id: 'rider-2',
    assigned_rider_name: 'Rider Two',
    delivery_status: 'failed',
  },
  {
    request_id: 'unassigned',
    delivery_status: 'pending',
  },
];

describe('weekly rider report aggregation', () => {
  it('groups every task by rider and keeps overdue as an independent flag', () => {
    const report = buildWeeklyRiderReport(tasks);

    expect(report).toHaveLength(3);
    expect(report.find((row) => row.riderId === 'rider-1')).toMatchObject({
      riderName: 'Rider One',
      assigned: 2,
      completed: 2,
      overdue: 1,
      onTimeRate: 50,
    });
    expect(report.find((row) => row.riderId === 'unassigned')).toMatchObject({
      riderName: 'Unassigned',
      open: 1,
    });
  });

  it('returns reconciled weekly totals and treats completed overdue work as completed and overdue', () => {
    expect(getWeeklyReportSummary(tasks)).toMatchObject({
      total: 4,
      completed: 2,
      failed: 1,
      overdue: 1,
      open: 1,
      cancelled: 0,
      onTimeRate: 50,
    });
  });
});
