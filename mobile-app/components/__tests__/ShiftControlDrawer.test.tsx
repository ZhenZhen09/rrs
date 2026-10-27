import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ShiftControlDrawer } from '../ShiftControlDrawer';
import { useLocation } from '@/context/LocationContext';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

jest.mock('@/context/LocationContext', () => ({ useLocation: jest.fn() }));
jest.mock('@/hooks/useReducedMotionPreference', () => ({ useReducedMotionPreference: jest.fn() }));

describe('ShiftControlDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocation as jest.Mock).mockReturnValue({
      hasOpenShift: true,
      isOnDuty: true,
      attendanceStatus: 'present',
      isShiftStatusReady: true,
    });
    (useReducedMotionPreference as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('floats the shift controls over the list and toggles them from the boundary handle', () => {
    render(<ShiftControlDrawer tasks={[]} />);

    const handle = screen.getByRole('button', { name: 'Show shift controls, On Duty' });
    expect(handle.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ minHeight: expect.any(Number), marginHorizontal: 16 }),
    ]));
    expect(screen.getByTestId('shift-drawer-handle-visual').props.style).toEqual(
      expect.objectContaining({ width: '100%', minHeight: 44 }),
    );
    expect(screen.queryByText('Shift')).toBeNull();
    expect(screen.getByText('On Duty')).toBeTruthy();
    expect(handle.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByTestId('shift-control-card')).toBeNull();

    fireEvent.press(handle);

    expect(screen.getByTestId('shift-control-card')).toBeTruthy();
    expect(screen.getByTestId('shift-drawer-anchor').props.style).toEqual(
      expect.objectContaining({ zIndex: 50 }),
    );
    expect(screen.getByTestId('shift-drawer-panel').props.style).toEqual(
      expect.objectContaining({ zIndex: 49 }),
    );
    expect(screen.getByRole('button', { name: 'Hide shift controls, On Duty' }).props.accessibilityState)
      .toEqual({ expanded: true });

    fireEvent.press(screen.getByRole('button', { name: 'Hide shift controls, On Duty' }));

    expect(screen.queryByTestId('shift-control-card')).toBeNull();
  });

  it('shows On Duty directly before attendance exists', () => {
    (useLocation as jest.Mock).mockReturnValue({
      hasOpenShift: false,
      isOnDuty: false,
      attendanceStatus: null,
      isShiftStatusReady: true,
    });
    render(<ShiftControlDrawer tasks={[]} />);
    expect(screen.getByRole('button', { name: 'On Duty' })).toBeTruthy();
  });

  it('removes the card immediately on close instead of fading its shadow over the list', () => {
    (useReducedMotionPreference as jest.Mock).mockReturnValue(false);
    render(<ShiftControlDrawer tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Show shift controls, On Duty' }));
    expect(screen.getByTestId('shift-control-card')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Hide shift controls, On Duty' }));

    expect(screen.queryByTestId('shift-control-card')).toBeNull();
  });

  it('starts the floating entrance animation when reduced motion is disabled', () => {
    const startAnimation = jest.fn();
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: startAnimation } as any);
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    (useReducedMotionPreference as jest.Mock).mockReturnValue(false);
    render(<ShiftControlDrawer tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Show shift controls, On Duty' }));

    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 200 }),
    );
    expect(startAnimation).toHaveBeenCalled();
  });

  it('does not hide the drawer while its entrance frame is waiting', () => {
    jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(1);
    (useReducedMotionPreference as jest.Mock).mockReturnValue(false);
    render(<ShiftControlDrawer tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Show shift controls, On Duty' }));

    expect(screen.getByTestId('shift-drawer-panel').props.style.opacity).toBeUndefined();
  });
});
