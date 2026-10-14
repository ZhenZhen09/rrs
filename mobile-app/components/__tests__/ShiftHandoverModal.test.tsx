import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HandoverModal } from '../HandoverModal';
import { ShiftEndModal } from '../ShiftEndModal';

describe('shift confirmation modals', () => {
  it('keeps the shift end prompt open when the server rejects the request', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn(async () => false);
    const screen = render(<ShiftEndModal visible onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.press(screen.getByText('End Shift'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps handover reason and prompt open when the server rejects the request', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn(async (_reason: string) => false);
    const screen = render(<HandoverModal visible onClose={onClose} onConfirm={onConfirm} taskCount={2} />);
    fireEvent.changeText(screen.getByPlaceholderText('Or type a specific reason here...'), 'Vehicle breakdown');
    fireEvent.press(screen.getByText('Confirm Shift End'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Vehicle breakdown'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Vehicle breakdown')).toBeTruthy();
  });

  it('closes the shift end prompt after the server confirms success', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn(async () => true);
    const screen = render(<ShiftEndModal visible onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.press(screen.getByText('End Shift'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
