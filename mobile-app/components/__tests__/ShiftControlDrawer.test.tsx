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

    const handle = screen.getByRole('button', { name: 'Open shift controls, Online' });
    expect(handle.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ minHeight: expect.any(Number), minWidth: 64, top: 0, zIndex: 51, elevation: 51 }),
    ]));
    expect(screen.getByTestId('shift-drawer-handle-visual').props.style).toEqual(
      expect.objectContaining({ width: 36, height: 24 }),
    );
    expect(screen.queryByText('Shift')).toBeNull();
    expect(screen.queryByText('Online')).toBeNull();
    expect(handle.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByTestId('shift-control-card')).toBeNull();

    fireEvent.press(handle);

    expect(screen.getByTestId('shift-control-card')).toBeTruthy();
    expect(screen.getByTestId('shift-drawer-anchor').props.style).toEqual(
      expect.objectContaining({ height: 0, overflow: 'visible' }),
    );
    expect(screen.getByTestId('shift-drawer-panel').props.style).toEqual(
      expect.objectContaining({ position: 'absolute' }),
    );
    expect(screen.getByRole('button', { name: 'Close shift controls, Online' }).props.accessibilityState)
      .toEqual({ expanded: true });

    fireEvent.press(screen.getByRole('button', { name: 'Close shift controls, Online' }));

    expect(screen.queryByTestId('shift-control-card')).toBeNull();
  });

  it('removes the card immediately on close instead of fading its shadow over the list', () => {
    (useReducedMotionPreference as jest.Mock).mockReturnValue(false);
    render(<ShiftControlDrawer tasks={[]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Open shift controls, Online' }));
    expect(screen.getByTestId('shift-control-card')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close shift controls, Online' }));

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

    fireEvent.press(screen.getByRole('button', { name: 'Open shift controls, Online' }));

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

    fireEvent.press(screen.getByRole('button', { name: 'Open shift controls, Online' }));

    expect(screen.getByTestId('shift-drawer-panel').props.style.opacity).toBeUndefined();
  });
});
