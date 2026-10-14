// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeliveryRequest } from '../../../../types';
import { RequestList } from '../RequestList';

const task = (request_id: string, delivery_status = 'assigned') => ({
  request_id,
  assigned_rider_id: 'rider-a',
  assigned_rider_name: 'Riley Rider',
  queue_order: request_id === 'task-a' ? 1 : 2,
  delivery_date: '2026-10-08',
  created_at: '2026-10-01T09:00:00Z',
  status: 'approved',
  delivery_status,
  pickup_location: { address: 'Pickup' },
  dropoff_location: { address: 'Dropoff', businessName: 'Building' },
  requester_name: 'Requester',
  urgency_level: 'Medium',
} as unknown as DeliveryRequest);

const renderActiveList = (activeSelectionEnabled: boolean) => render(
  <RequestList
    requests={[]}
    filteredRequests={[task('mission-task', 'in_progress'), task('task-a')]}
    selectedId={null}
    onSelect={() => undefined}
    selectedIds={[]}
    onToggleSelect={() => undefined}
    activeSelectionEnabled={activeSelectionEnabled}
    filter="active"
    sortBy="sequence"
    onSortChange={() => undefined}
  />,
);

afterEach(cleanup);

describe('active route selection UI', () => {
  it('shows selectable queued tasks only when active selection is enabled', () => {
    renderActiveList(false);
    expect(screen.queryByRole('button', { name: 'Select request task-a' })).toBeNull();
    cleanup();

    renderActiveList(true);
    expect(screen.getByRole('button', { name: 'Select request task-a' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select request mission-task' })).toBeNull();
  });

  it('uses a mobile sized touch target and toggles task selection without opening details', () => {
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <RequestList
        requests={[]}
        filteredRequests={[task('task-a')]}
        selectedId={null}
        onSelect={onSelect}
        selectedIds={[]}
        onToggleSelect={onToggleSelect}
        activeSelectionEnabled
        filter="active"
        sortBy="sequence"
        onSortChange={() => undefined}
      />,
    );

    const checkbox = screen.getByRole('button', { name: 'Select request task-a' });
    expect(checkbox.className).toContain('h-11 w-11');
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('task-a');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
