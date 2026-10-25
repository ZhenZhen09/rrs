// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EnhancedBatchApproveModal } from '../../src/app/components/Admin/EnhancedBatchApproveModal';
import { PasswordResetOverlay } from '../../src/app/components/PasswordResetOverlay';
import type { DeliveryRequest, User } from '../../src/app/types';

vi.mock('../../src/app/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

const request = (id: string, status: DeliveryRequest['delivery_status'], order?: number) => ({
  request_id: id, delivery_status: status, queue_order: order,
  dropoff_location: { businessName: id }, delivery_date: '2026-10-04',
  time_window: '10:00 - 12:00', urgency_level: 'Medium', requester_department: 'Operations',
} as DeliveryRequest);

describe('modal state across changing selections', () => {
  it('pins missions, respects saved order, and clears removed tasks while retaining the chosen rider and note', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const props = { isOpen: true, onClose: vi.fn(), onConfirm, isSubmitting: false,
      riders: [{ id: 'rider', name: 'Test Rider', is_on_duty: true } as User] };
    const { rerender } = render(<EnhancedBatchApproveModal {...props}
      selectedRequests={[request('late', 'assigned', 2), request('mission', 'in_progress'), request('early', 'assigned', 1)]} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Rider/ }));
    const note = screen.getByRole('textbox');
    fireEvent.change(note, { target: { value: 'Keep this note' } });
    fireEvent.click(screen.getByRole('button', { name: /Assign tasks/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('rider', ['mission', 'early', 'late'], 'Keep this note'));
    rerender(<EnhancedBatchApproveModal {...props} selectedRequests={[]} />);
    expect(screen.queryByText('mission')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Assign tasks/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenLastCalledWith('rider', [], 'Keep this note'));
  });

  it('clears password fields when the overlay reopens', async () => {
    const props = { visible: true, userId: 'user', userRole: 'admin', onClose: vi.fn(), onSuccess: vi.fn() };
    const { container, rerender } = render(<PasswordResetOverlay {...props} />);
    for (const input of container.querySelectorAll('input')) {
      fireEvent.change(input, { target: { value: 'Example123!' } });
    }
    rerender(<PasswordResetOverlay {...props} visible={false} />);
    rerender(<PasswordResetOverlay {...props} />);
    await waitFor(() => {
      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBe(2);
      for (const input of inputs) expect(input.value).toBe('');
    });
  });
});
