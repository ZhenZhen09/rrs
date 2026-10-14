import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ShiftControlCard } from '../ShiftControlCard';
import { useLocation } from '@/context/LocationContext';
import { Job } from '@/types';

jest.mock('@/context/LocationContext', () => ({ useLocation: jest.fn() }));

const makeJob = (deliveryDate: string, deliveryStatus = 'pending'): Job => ({
  request_id: 'job_1',
  requester_name: 'Requester',
  delivery_date: deliveryDate,
  time_window: 'Morning',
  pickup_location: { lat: 1, lng: 1, address: 'Pickup' },
  dropoff_location: { lat: 1, lng: 1, address: 'Dropoff' },
  recipient_name: 'Recipient',
  recipient_contact: '000',
  urgency_level: 'normal',
  status: 'approved',
  delivery_status: deliveryStatus,
  assigned_rider_id: 'rider_1',
  request_type: 'delivery',
});

describe('ShiftControlCard', () => {
  const toggleDuty = jest.fn();
  const endShift = jest.fn();
  const checkIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, attendanceStatus: null, isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
  });

  it('shows a start action before attendance has started', async () => {
    checkIn.mockResolvedValue(true);
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Start shift' }));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith('present'));
    expect(screen.getByText('Not started')).toBeTruthy();
  });

  it('offers a new shift after the previous shift ended', async () => {
    checkIn.mockResolvedValue(true);
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Start shift again' }));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith('present'));
    expect(screen.getByText('Shift ended')).toBeTruthy();
  });

  it('opens absence reporting only when requested and records the selected reason', async () => {
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Report absence or leave' }));
    expect(screen.getByTestId('attendance-report-modal').props.visible).toBe(true);

    expect(screen.getByText('Report Absence')).toBeTruthy();
    expect(screen.queryByText('Good Morning!')).toBeNull();

    fireEvent.press(screen.getByText('Sick Leave'));
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith('absent', 'Sick Leave'));
    expect(screen.queryByText('Report Absence')).toBeNull();
  });

  it('shows compact availability and shift-end actions while a shift is open', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: '2026-10-14 12:24:00', toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    expect(screen.getByText('Shift today')).toBeTruthy();
    expect(screen.getByText('ONLINE')).toBeTruthy();
    expect(screen.getByText('Started 12:24 PM')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go offline' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End shift' })).toBeTruthy();
  });

  it('lets a rider go offline without ending the shift even with active work', async () => {
    toggleDuty.mockResolvedValue('success');
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[makeJob('2026-10-07')]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Go offline' }));

    await waitFor(() => expect(toggleDuty).toHaveBeenCalledWith(false));
    expect(endShift).not.toHaveBeenCalled();
  });

  it('offers a separate shift-end confirmation when no active work remains', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[makeJob('2026-10-06', 'completed')]} />);

    fireEvent.press(screen.getByLabelText('End shift'));

    expect(screen.getByText('End Shift?')).toBeTruthy();
  });

  it('asks for a handover reason only when ending with active work', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[makeJob('2026-10-07')]} />);

    fireEvent.press(screen.getByRole('button', { name: 'End shift' }));

    expect(screen.getByText('Incomplete Tasks')).toBeTruthy();
    expect(screen.getByPlaceholderText('Or type a specific reason here...')).toBeTruthy();
  });
});
