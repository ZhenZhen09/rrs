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

  it('shows On Duty as the action that records attendance', async () => {
    toggleDuty.mockResolvedValue('success');
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'On Duty' }));

    await waitFor(() => expect(toggleDuty).toHaveBeenCalledWith(true));
    expect(checkIn).not.toHaveBeenCalled();
    expect(screen.getByText('OFF DUTY')).toBeTruthy();
  });

  it('offers On Duty after the previous shift ended', async () => {
    toggleDuty.mockResolvedValue('success');
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'On Duty' }));

    await waitFor(() => expect(toggleDuty).toHaveBeenCalledWith(true));
    expect(screen.getByText('OFF DUTY')).toBeTruthy();
  });

  it('lets an approved automatic no-show check in without going On Duty', async () => {
    checkIn.mockResolvedValue(true);
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'absent', isLateCheckInApproved: true,
      isShiftStatusReady: true, shiftHoursLocked: false, shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Check in late' }));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith('present'));
    expect(toggleDuty).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'On Duty' })).toBeNull();
  });

  it('does not expose late check-in while an automatic absence is unapproved', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'absent', isLateCheckInApproved: false,
      isShiftStatusReady: true, shiftHoursLocked: false, shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    expect(screen.queryByRole('button', { name: 'Check in late' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'On Duty' })).toBeNull();
    expect(screen.getByText(/Contact Admin if you need to check in late/)).toBeTruthy();
  });

  it('puts the rider On Duty only after the shift is open', async () => {
    toggleDuty.mockResolvedValue('success');
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'On Duty' }));
    await waitFor(() => expect(toggleDuty).toHaveBeenCalledWith(true));
  });

  it('opens absence reporting only when requested and records the selected reason', async () => {
    checkIn.mockResolvedValue(true);
    render(<ShiftControlCard tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Report absence or leave' }));
    expect(screen.getByTestId('attendance-report-modal').props.visible).toBe(true);

    expect(screen.getByText('Report Absence')).toBeTruthy();
    expect(screen.queryByText('Good Morning!')).toBeNull();

    fireEvent.press(screen.getByText('Sick Leave'));
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith('absent', 'Sick Leave'));
    await waitFor(() => expect(screen.queryByText('Report Absence')).toBeNull());
  });

  it('shows compact availability and shift-end actions while a shift is open', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: '2026-10-14 12:24:00', toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[]} />);

    expect(screen.getByText('Shift today')).toBeTruthy();
    expect(screen.getByText('ON DUTY')).toBeTruthy();
    expect(screen.getByText('Started 12:24 PM')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause availability' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End shift' })).toBeTruthy();
    expect(screen.getByText('Pausing availability keeps your shift open. Use End shift to record your end time.')).toBeTruthy();
  });

  it('lets a rider go offline without ending the shift even with active work', async () => {
    toggleDuty.mockResolvedValue('success');
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
      shiftStartedAt: null, toggleDuty, endShift, checkIn,
    });
    render(<ShiftControlCard tasks={[makeJob('2026-10-07')]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Pause availability' }));

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
