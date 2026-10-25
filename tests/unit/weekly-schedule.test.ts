import { describe, expect, it } from 'vitest';
import { getWeeklyResolutionDetails, getWeeklyResolverLabel, getWeeklyScheduleDetailLabels, getWeeklyStartedAt } from '../../src/app/utils/weeklySchedule';

describe('weekly schedule resolution details', () => {
  it('labels a completed overdue task with its resolver and resolution time', () => {
    expect(getWeeklyResolutionDetails({
      delivery_status: 'completed',
      overdue_at: '2026-10-01T11:00:00.000Z',
      finished_at: '2026-10-02T02:15:00.000Z',
      resolved_by_role: 'admin',
      resolved_by_name: 'Admin User',
    })).toEqual({
      outcome: 'Completed',
      overdue: true,
      resolvedBy: 'Admin User (Admin)',
      resolvedAt: '2026-10-02T02:15:00.000Z',
    });
  });

  it('labels a failed task separately from a completed task', () => {
    expect(getWeeklyResolutionDetails({
      delivery_status: 'failed',
      finished_at: '2026-10-01T10:15:00.000Z',
      resolved_by_role: 'rider',
      resolved_by_name: 'Test Rider',
    })).toEqual({
      outcome: 'Failed',
      overdue: false,
      resolvedBy: 'Test Rider (Rider)',
      resolvedAt: '2026-10-01T10:15:00.000Z',
    });
  });

  it('labels canceled tasks with who canceled them', () => {
    expect(getWeeklyResolverLabel('Cancelled')).toBe('Cancelled by');
  });

  it('treats a disapproved request as canceled in the weekly schedule', () => {
    expect(getWeeklyResolutionDetails({
      status: 'disapproved',
      delivery_status: 'pending',
      resolved_by_role: 'admin',
      resolved_by_name: 'Admin User',
    })).toEqual({
      outcome: 'Cancelled',
      overdue: false,
      resolvedBy: 'Admin User (Admin)',
      resolvedAt: null,
    });
  });

  it('falls back to Admin for historical disapprovals without audit actor data', () => {
    expect(getWeeklyResolutionDetails({
      status: 'disapproved',
      delivery_status: 'pending',
    }).resolvedBy).toBe('Admin');
  });

  it('does not show a resolver for an unresolved task', () => {
    expect(getWeeklyResolutionDetails({ delivery_status: 'in_progress' })).toEqual({
      outcome: 'Open',
      overdue: false,
      resolvedBy: '—',
      resolvedAt: null,
    });
  });

  it('uses the overdue detail order for overdue tasks', () => {
    expect(getWeeklyScheduleDetailLabels({ overdue_at: '2026-10-01T11:00:00.000Z' })).toEqual([
      'Destination building', 'Transaction #', 'Scheduled', 'Overdue at', 'Started', 'Ended', 'Resolved by',
    ]);
  });

  it('uses the compact detail order for normal tasks', () => {
    expect(getWeeklyScheduleDetailLabels({ overdue_at: null })).toEqual([
      'Destination building', 'Transaction #', 'Scheduled', 'Started', 'Ended', 'Resolved by',
    ]);
  });

  it('uses the admin resolution time as started time for an overdue task without a rider start', () => {
    expect(getWeeklyStartedAt({
      delivery_status: 'failed',
      overdue_at: '2026-10-01T11:00:00.000Z',
      started_at: null,
      finished_at: '2026-10-01T12:30:00.000Z',
      resolved_by_role: 'admin',
    })).toBe('2026-10-01T12:30:00.000Z');
  });

  it('preserves the actual rider start time when one exists', () => {
    expect(getWeeklyStartedAt({
      delivery_status: 'completed',
      overdue_at: '2026-10-01T11:00:00.000Z',
      started_at: '2026-10-01T11:15:00.000Z',
      finished_at: '2026-10-01T12:30:00.000Z',
      resolved_by_role: 'admin',
    })).toBe('2026-10-01T11:15:00.000Z');
  });
});
