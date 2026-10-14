// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EnhancedBatchApproveModal } from '../../EnhancedBatchApproveModal';
import type { DeliveryRequest, User } from '../../../../types';
import type { RiderAvailabilityInput } from '../../../../utils/riderAvailability';

const rider = { id: 'rider-1', name: 'Rider One', email: 'rider@example.com', role: 'rider', is_on_duty: true,
  is_online: true, attendance_status: 'present' } as User & RiderAvailabilityInput;
const task = {
  request_id: 'task-1', delivery_status: 'assigned', delivery_date: '2026-10-08', time_window: '09:00 - 10:00',
  dropoff_location: { businessName: 'North Building' }, requester_name: 'Pat Requester', requester_department: 'Operations',
  urgency_level: 'Medium',
} as DeliveryRequest;

describe('dispatch assignment flow', () => {
  it('keeps the rider fixed during route review and submits the complete displayed order', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<EnhancedBatchApproveModal
      isOpen onClose={vi.fn()} selectedRequests={[task]} riders={[rider]} onConfirm={onConfirm} isSubmitting={false}
      mode="route-review" fixedRiderId="rider-1"
    />);

    expect(screen.getByText('Rider: Rider One')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Rider One/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save route order' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('rider-1', ['task-1'], ''));
  });

  it('keeps one rider picker for batch assignment', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<EnhancedBatchApproveModal
      isOpen onClose={vi.fn()} selectedRequests={[task]} riders={[rider]} onConfirm={onConfirm} isSubmitting={false}
      mode="batch-assign"
    />);

    fireEvent.click(screen.getByRole('button', { name: /Rider One/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign tasks' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('rider-1', ['task-1'], ''));
  });

  it('keeps the selected order open when assignment fails', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new Error('assignment failed'));
    render(<EnhancedBatchApproveModal
      isOpen onClose={onClose} selectedRequests={[task]} riders={[rider]} onConfirm={onConfirm} isSubmitting={false}
      mode="batch-assign"
    />);
    fireEvent.click(screen.getByRole('button', { name: /Rider One/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign tasks' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Assign selected tasks' })).toBeTruthy();
  });
});
