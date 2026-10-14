import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Job } from '@/types';
import { OverdueTaskCard } from '../OverdueTaskCard';

const task: Job = {
  request_id: 'REQ-12345',
  requester_name: 'Jordan Requester',
  delivery_date: '2026-10-07',
  time_window: '9:00 AM - 10:00 AM',
  scheduled_end_at: '2026-10-07T10:00:00+08:00',
  overdue_minutes: 803,
  pickup_location: { lat: 1, lng: 1, address: 'Pickup' },
  dropoff_location: {
    lat: 1,
    lng: 1,
    address: '42 Delivery Road',
    businessName: 'Central Building',
  },
  recipient_name: 'Taylor Recipient',
  recipient_contact: '000',
  urgency_level: 'normal',
  status: 'approved',
  delivery_status: 'pending',
  assigned_rider_id: 'rider-1',
  request_type: 'delivery',
};

describe('OverdueTaskCard', () => {
  it('shows the scheduled date, overdue duration, and requested task details without an overdue badge', () => {
    render(<OverdueTaskCard task={task} index={0} allTasks={[task]} isLocked={false} onPress={jest.fn()} />);

    expect(screen.getByText('SCHEDULED FOR')).toBeTruthy();
    expect(screen.getByText('Central Building')).toBeTruthy();
    expect(screen.getByText('42 Delivery Road')).toBeTruthy();
    expect(screen.getByText('Jordan Requester')).toBeTruthy();
    expect(screen.getByText('Taylor Recipient')).toBeTruthy();
    expect(screen.getByText('13 hr 23 min')).toBeTruthy();
    expect(screen.getByText('STOP 1 OF 1')).toBeTruthy();
    expect(screen.getByText('DEADLINE')).toBeTruthy();
    expect(screen.queryByText('OVERDUE')).toBeNull();
    expect(screen.getByText('View')).toBeTruthy();
  });

  it('keeps the View action connected to the card press handler', () => {
    const onPress = jest.fn();
    render(<OverdueTaskCard task={task} index={0} allTasks={[task]} isLocked={false} onPress={onPress} />);

    fireEvent.press(screen.getByText('View'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
