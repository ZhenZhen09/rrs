// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnhancedBatchApproveModal } from '../EnhancedBatchApproveModal';
import { isScheduledForToday, type RiderAvailabilityInput } from '../../../utils/riderAvailability';
import type { DeliveryRequest, User } from '../../../types';

afterEach(() => cleanup());

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const makeTask = (id: string, delivery_date: string) => ({
  request_id: id, delivery_status: 'pending', delivery_date, time_window: '09:00 - 10:00',
  requester_department: 'Operations', urgency_level: 'Medium', dropoff_location: { businessName: 'Test Building' },
} as DeliveryRequest);
const taskToday = makeTask('today-task', today);
const taskFuture = makeTask('future-task', tomorrow);

const makeRider = (availability: RiderAvailabilityInput) => ({
  id: 'rider-1', name: 'Rider One', email: 'rider@example.com', role: 'rider', ...availability,
} as User & RiderAvailabilityInput);
type Confirm = (riderId: string, sequence: string[], note: string) => Promise<void>;
const makeConfirm = () => vi.fn<Confirm>().mockResolvedValue(undefined);

const renderModal = ({ rider, tasks = [taskToday], onConfirm = makeConfirm(), mode = 'batch-assign' }: {
  rider: User & RiderAvailabilityInput;
  tasks?: DeliveryRequest[];
  onConfirm?: ReturnType<typeof makeConfirm>;
  mode?: 'batch-assign' | 'route-review';
}) => {
  render(<EnhancedBatchApproveModal isOpen onClose={vi.fn()} selectedRequests={tasks} riders={[rider]}
    onConfirm={onConfirm} isSubmitting={false} mode={mode} fixedRiderId={mode === 'route-review' ? rider.id : undefined} />);
  return { option: screen.queryByRole('button', { name: /Rider One/i }), onConfirm };
};

describe('Interceptor rider availability', () => {
  it('allows a same-day online on-duty rider with no attendance report', () => {
    const { option } = renderModal({ rider: makeRider({ is_online: true, is_on_duty: true, attendance_status: null }) });
    expect(option?.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.queryByText(/NO REPORT/i)).toBeNull();
  });

  it.each([
    ['Absent', { is_online: true, is_on_duty: true, attendance_status: 'absent' }],
    ['On Leave', { is_online: true, is_on_duty: true, attendance_status: 'on_leave' }],
    ['off duty', { is_online: true, is_on_duty: false, attendance_status: 'present' }],
    ['offline', { is_online: false, is_on_duty: true, attendance_status: 'present' }],
  ] as const)('disables a same-day rider who is %s', (_reason, availability) => {
    const { option } = renderModal({ rider: makeRider(availability) });
    expect(option?.hasAttribute('disabled')).toBe(true);
  });

  it('allows a future-only batch regardless of today status and shows actual presence', () => {
    expect(isScheduledForToday(taskFuture.delivery_date)).toBe(false);
    const { option } = renderModal({
      tasks: [taskFuture],
      rider: makeRider({ is_online: false, is_on_duty: false, attendance_status: 'absent' }),
    });
    expect(option?.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('requires same-day eligibility when the batch mixes today and future tasks', () => {
    const { option } = renderModal({
      tasks: [taskToday, taskFuture],
      rider: makeRider({ is_online: false, is_on_duty: true, attendance_status: 'present' }),
    });
    expect(option?.hasAttribute('disabled')).toBe(true);
  });

  it('blocks submit when the selected rider becomes unavailable', () => {
    const onConfirm = makeConfirm();
    const { rerender } = render(<EnhancedBatchApproveModal isOpen onClose={vi.fn()} selectedRequests={[taskToday]}
      riders={[makeRider({ is_online: true, is_on_duty: true, attendance_status: null })]} onConfirm={onConfirm}
      isSubmitting={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Rider One/i }));
    rerender(<EnhancedBatchApproveModal isOpen onClose={vi.fn()} selectedRequests={[taskToday]}
      riders={[makeRider({ is_online: false, is_on_duty: true, attendance_status: null })]} onConfirm={onConfirm}
      isSubmitting={false} />);

    const assign = screen.getByRole('button', { name: 'Assign tasks' });
    expect(assign.hasAttribute('disabled')).toBe(true);
    fireEvent.click(assign);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps route review fixed to the existing rider', () => {
    const { option } = renderModal({
      mode: 'route-review',
      rider: makeRider({ is_online: false, is_on_duty: false, attendance_status: 'absent' }),
    });
    expect(option).toBeNull();
    expect(screen.getByText('Rider: Rider One')).toBeTruthy();
  });
});
