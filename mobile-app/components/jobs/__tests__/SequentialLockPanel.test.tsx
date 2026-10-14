import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SequentialLockPanel } from '../SequentialLockPanel';

describe('SequentialLockPanel', () => {
  it('keeps the active request and both rider actions in a compact touch-friendly panel', () => {
    const onBackToTasks = jest.fn();
    const onRequestSequenceSkip = jest.fn();
    const { getByText, getByTestId } = render(
      <SequentialLockPanel
        activeRequestId="request-AB123456"
        onBackToTasks={onBackToTasks}
        onRequestSequenceSkip={onRequestSequenceSkip}
      />
    );

    expect(getByTestId('sequential-lock-panel')).toBeTruthy();
    expect(getByText('SEQUENTIAL LOCK ACTIVE')).toBeTruthy();
    expect(getByText('#AB123456')).toBeTruthy();
    expect(getByTestId('locked-back-to-tasks')).toHaveStyle({ minHeight: 44 });
    expect(getByTestId('locked-request-sequence-skip')).toHaveStyle({ minHeight: 44 });

    fireEvent.press(getByTestId('locked-back-to-tasks'));
    fireEvent.press(getByTestId('locked-request-sequence-skip'));
    expect(onBackToTasks).toHaveBeenCalledTimes(1);
    expect(onRequestSequenceSkip).toHaveBeenCalledTimes(1);
  });
});
