import { describe, expect, it } from 'vitest';
import { getOverdueMetadata } from '../../server/utils/overdue';

const baseRequest = {
  delivery_date: '2026-10-01',
  delivery_status: 'assigned',
  status: 'approved',
  assigned_rider_id: 'test-rider-id',
};

describe('overdue metadata', () => {
  it('does not mark same-day work overdue before the 7 PM Philippine cutoff', () => {
    expect(getOverdueMetadata(baseRequest, new Date('2026-10-01T10:59:00+08:00')).is_overdue).toBe(false);
  });

  it('marks same-day unfinished work overdue at the 7 PM Philippine cutoff', () => {
    const metadata = getOverdueMetadata(baseRequest, new Date('2026-10-01T19:00:00+08:00'));
    expect(metadata.is_overdue).toBe(true);
    expect(metadata.overdue_minutes).toBe(0);
    expect(metadata.recommended_action).toBe('contact_rider');
  });

  it('marks prior-date work overdue and recommends tracking work already in progress', () => {
    const metadata = getOverdueMetadata(
      { ...baseRequest, delivery_date: '2026-09-30', delivery_status: 'in_progress' },
      new Date('2026-10-01T10:00:00+08:00'),
    );
    expect(metadata.is_overdue).toBe(true);
    expect(metadata.overdue_minutes).toBe(900);
    expect(metadata.recommended_action).toBe('track_rider');
  });

  it('does not mark terminal work overdue', () => {
    expect(getOverdueMetadata({ ...baseRequest, delivery_status: 'completed' }, new Date('2026-10-02T10:00:00+08:00')).is_overdue).toBe(false);
  });

  it('does not mark overdue work without an assigned rider', () => {
    expect(getOverdueMetadata(
      { ...baseRequest, assigned_rider_id: null },
      new Date('2026-10-02T10:00:00+08:00'),
    ).is_overdue).toBe(false);
  });

  it('does not mark assigned work overdue before approval', () => {
    expect(getOverdueMetadata(
      { ...baseRequest, status: 'pending' },
      new Date('2026-10-02T10:00:00+08:00'),
    ).is_overdue).toBe(false);
  });
});
