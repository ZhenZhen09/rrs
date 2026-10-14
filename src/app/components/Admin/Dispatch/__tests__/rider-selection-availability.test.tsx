// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RiderSelectionList } from '../RiderSelectionList';

const today = new Date().toISOString().slice(0, 10);

const renderList = (rider: any, deliveryDate = today) => {
  cleanup();
  const onSelect = vi.fn();
  render(
    <RiderSelectionList
      riders={[{ id: 'rider-1', name: 'Rider One', ...rider }] as any}
      selectedRiderId=""
      onSelect={onSelect}
      deliveryDate={deliveryDate}
    />,
  );
  return onSelect;
};

describe('RiderSelectionList availability', () => {
  it('shows only the rider identity and online status when no attendance report exists', () => {
    const onSelect = renderList({ is_online: true, is_on_duty: true, attendance_status: null });
    expect(screen.queryByText(/NO REPORT/i)).toBeNull();
    expect(screen.queryByText('4.9')).toBeNull();
    expect(screen.queryByText(/km away/i)).toBeNull();
    expect(screen.queryByText(/jobs/i)).toBeNull();
    expect(screen.getByText(/ONLINE/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Rider One/i }));
    expect(onSelect).toHaveBeenCalledWith('rider-1');
  });

  it('shows the existing static avatar image without an avatar field from the API', () => {
    renderList({ is_online: true, is_on_duty: true });
    expect(screen.getByRole('img', { name: 'Rider One avatar' }).getAttribute('src'))
      .toBe('/rider-avatars/avatar_05.png');
  });

  it('renders the rider saved avatar from the API', () => {
    renderList({ is_online: true, is_on_duty: true, avatar_id: 'avatar_02' });
    expect(screen.getByRole('img', { name: 'Rider One avatar' }).getAttribute('src'))
      .toBe('/rider-avatars/avatar_02.png');
  });

  it('does not select an absent rider for a same-day task', () => {
    const onSelect = renderList({ is_online: true, is_on_duty: true, attendance_status: 'absent' });
    const card = screen.getByRole('button', { name: /Rider One/i });
    expect(screen.queryByText(/ABSENT/i)).toBeNull();
    expect(screen.getByText(/ONLINE/i)).toBeTruthy();
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not block a future task because the rider is absent today', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const onSelect = renderList({ is_online: false, is_on_duty: false, attendance_status: 'absent' }, futureDate);
    fireEvent.click(screen.getByRole('button', { name: /Rider One/i }));
    expect(onSelect).toHaveBeenCalledWith('rider-1');
  });
});
