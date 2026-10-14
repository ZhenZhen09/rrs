import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { DashboardTransitionOverlay } from '../DashboardTransitionOverlay';

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe('DashboardTransitionOverlay', () => {
  it('shows the slow-load message only after loading takes longer than expected', () => {
    jest.useFakeTimers();
    const { getByTestId, queryByText } = render(
      <DashboardTransitionOverlay visible error={null} onRetry={jest.fn()} />,
    );

    expect(getByTestId('dashboard_transition_logo')).toBeTruthy();
    expect(queryByText('Preparing your tasks…')).toBeNull();

    act(() => jest.advanceTimersByTime(900));

    expect(queryByText('Preparing your tasks…')).toBeTruthy();
  });

  it('shows a retry action when loading fails', () => {
    const onRetry = jest.fn();
    const { getByText, queryByTestId } = render(
      <DashboardTransitionOverlay visible error={new Error('offline')} onRetry={onRetry} />,
    );

    fireEvent.press(getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(queryByTestId('dashboard_transition_spinner')).toBeNull();
  });

  it('restarts the slow-load threshold after a rapid hide and show', () => {
    jest.useFakeTimers();
    const onRetry = jest.fn();
    const { getByText, queryByText, rerender } = render(
      <DashboardTransitionOverlay visible error={null} onRetry={onRetry} />,
    );
    act(() => jest.advanceTimersByTime(900));
    expect(getByText('Preparing your tasks…')).toBeTruthy();

    rerender(<DashboardTransitionOverlay visible={false} error={null} onRetry={onRetry} />);
    rerender(<DashboardTransitionOverlay visible error={null} onRetry={onRetry} />);
    act(() => jest.advanceTimersByTime(0));

    expect(queryByText('Preparing your tasks…')).toBeNull();
    act(() => jest.advanceTimersByTime(899));
    expect(queryByText('Preparing your tasks…')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(getByText('Preparing your tasks…')).toBeTruthy();
  });

  it('does not expose or block the dashboard when there is no authentication or dashboard load', () => {
    const { queryByTestId } = render(
      <DashboardTransitionOverlay visible={false} error={null} onRetry={jest.fn()} />,
    );

    expect(queryByTestId('dashboard_transition_overlay')).toBeNull();
    expect(queryByTestId('dashboard_transition_spinner')).toBeNull();
  });
});
