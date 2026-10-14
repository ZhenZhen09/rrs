import { getRiderTaskCounts, getRiderTaskSequenceLabel, getRiderTaskTab, getRiderTasksForTab, isTaskLocked } from '../taskFilters';
import { Job } from '@/types';

const makeJob = (overrides: Partial<Job>): Job => ({
  request_id: 'req_test',
  requester_name: 'Requester',
  delivery_date: '2026-05-25',
  time_window: '09:00 - 10:00',
  pickup_location: { lat: 0, lng: 0, address: 'Pickup' },
  dropoff_location: { lat: 0, lng: 0, address: 'Dropoff' },
  recipient_name: 'Recipient',
  recipient_contact: '09000000000',
  urgency_level: 'Medium',
  status: 'approved',
  delivery_status: 'assigned',
  assigned_rider_id: 'rider_001',
  request_type: 'Delivery/Pickup',
  ...overrides,
});

describe('taskFilters', () => {
  const today = new Date(2026, 4, 25, 8, 30);

  it('classifies active approved jobs into rider tabs by local calendar date', () => {
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-24' }), today)).toBe('overdue');
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-25' }), today)).toBe('today');
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-26' }), today)).toBe('tomorrow');
  });

  it('moves same-day jobs to overdue only at or after 7:00 PM (19:00)', () => {
    const jobToday = makeJob({ delivery_date: '2026-05-25' });
    
    // 6:59 PM -> Today
    const beforeSeven = new Date(2026, 4, 25, 18, 59);
    expect(getRiderTaskTab(jobToday, beforeSeven)).toBe('today');
    
    // 7:00 PM -> Overdue
    const atSeven = new Date(2026, 4, 25, 19, 0);
    expect(getRiderTaskTab(jobToday, atSeven)).toBe('overdue');
    
    // 8:00 PM -> Overdue
    const afterSeven = new Date(2026, 4, 25, 20, 0);
    expect(getRiderTaskTab(jobToday, afterSeven)).toBe('overdue');
  });

  it('hides unapproved and terminal jobs from active rider tabs', () => {
    expect(getRiderTaskTab(makeJob({ status: 'pending' }), today)).toBe('hidden');
    expect(getRiderTaskTab(makeJob({ delivery_status: 'completed' }), today)).toBe('hidden');
  });

  it('uses the same classification for badge counts', () => {
    const counts = getRiderTaskCounts([
      makeJob({ request_id: 'overdue', delivery_date: '2026-05-24' }),
      makeJob({ request_id: 'today', delivery_date: '2026-05-25', time_window: '09:00 - 10:00' }),
      makeJob({ request_id: 'tomorrow', delivery_date: '2026-05-26' }),
      makeJob({ request_id: 'future', delivery_date: '2026-06-10' }),
      makeJob({ request_id: 'done', delivery_date: '2026-05-25', delivery_status: 'completed' }),
    ], today);

    expect(counts).toEqual({ today: 1, overdue: 1, upcoming: 2 });
  });

  it('shows server-marked overdue work even when delivery status is missing', () => {
    expect(getRiderTaskTab(makeJob({ delivery_status: undefined, is_overdue: true }), today)).toBe('overdue');
  });

  it('labels each task using its position across all active tabs', () => {
    const tasks = [
      makeJob({ request_id: 'today', delivery_date: '2026-05-25', queue_order: 2 }),
      makeJob({ request_id: 'upcoming', delivery_date: '2026-05-26', queue_order: 3 }),
      makeJob({ request_id: 'overdue', delivery_date: '2026-05-24', queue_order: 1 }),
      makeJob({ request_id: 'future', delivery_date: '2026-06-10', queue_order: 4 }),
      makeJob({ request_id: 'completed', delivery_status: 'completed', queue_order: 5 }),
    ];

    expect(getRiderTaskSequenceLabel(tasks[0], tasks)).toBe('STOP 2 OF 4');
    expect(getRiderTaskSequenceLabel(tasks[1], tasks)).toBe('STOP 3 OF 4');
    expect(getRiderTaskSequenceLabel(tasks[2], tasks)).toBe('STOP 1 OF 4');
    expect(getRiderTaskSequenceLabel(tasks[3], tasks)).toBe('STOP 4 OF 4');
  });

  it('uses the admin-assigned queue rank for locks even when a lower rank has a later delivery date', () => {
    const movedToFirstToday = makeJob({ request_id: 'moved', delivery_date: '2026-05-25', queue_order: 1 });
    const oldDateButLowerPriority = makeJob({ request_id: 'older', delivery_date: '2026-05-24', queue_order: 2 });

    expect(isTaskLocked(movedToFirstToday, [movedToFirstToday, oldDateButLowerPriority])).toBe(false);
    expect(isTaskLocked(oldDateButLowerPriority, [movedToFirstToday, oldDateButLowerPriority])).toBe(true);
  });

  it('uses request ID as a stable tie breaker for duplicate stored queue positions', () => {
    const tasks = [
      makeJob({ request_id: 'b', queue_order: 1 }),
      makeJob({ request_id: 'a', queue_order: 1 }),
    ];

    expect(getRiderTaskSequenceLabel(tasks[1], tasks)).toBe('STOP 1 OF 2');
    expect(getRiderTaskSequenceLabel(tasks[0], tasks)).toBe('STOP 2 OF 2');
  });

  it('returns tomorrow and later jobs in dispatch queue order', () => {
    const jobs = [
      makeJob({ request_id: 'later', delivery_date: '2026-06-10', queue_order: 2 }),
      makeJob({ request_id: 'today', delivery_date: '2026-05-25', queue_order: 1 }),
      makeJob({ request_id: 'first', delivery_date: '2026-05-26', queue_order: 1 }),
    ];

    expect(getRiderTasksForTab(jobs, 'tomorrow', today).map(job => job.request_id)).toEqual(['first', 'later']);
  });
});
