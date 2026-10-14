import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../settings';

const mockUpdateAvatar = jest.fn();
const mockBack = jest.fn();
let mockUser = { id: 'rider-1', name: 'Alex Rider', avatar_id: 'avatar_01' };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateAvatar: mockUpdateAvatar }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

beforeEach(() => {
  mockUser = { id: 'rider-1', name: 'Alex Rider', avatar_id: 'avatar_01' };
  mockUpdateAvatar.mockReset();
  mockBack.mockReset();
});

it('shows the rider profile and saves a new choice only after confirmation', async () => {
  let finish!: () => void;
  mockUpdateAvatar.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  render(<SettingsScreen />);
  expect(screen.getByText('Alex Rider')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save avatar' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save avatar' }).props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(screen.getByRole('radio', { name: 'Avatar 3' }));
  expect(mockUpdateAvatar).not.toHaveBeenCalled();
  expect(screen.getByRole('radio', { name: 'Avatar 3, selected' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save avatar' }).props.accessibilityState).toMatchObject({ disabled: false });
  fireEvent.press(screen.getByRole('button', { name: 'Save avatar' }));
  expect(screen.getByText('Saving avatar…')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Avatar 3, selected' })).toBeTruthy();
  finish();
  await waitFor(() => expect(screen.getByText('Avatar saved')).toBeTruthy());
  expect(mockUpdateAvatar).toHaveBeenCalledWith('avatar_03');
  expect(screen.getByRole('button', { name: 'Save avatar' }).props.accessibilityState).toMatchObject({ disabled: true });
});

it('keeps the saved choice visible after a failed save and allows a retry', async () => {
  mockUpdateAvatar.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
  render(<SettingsScreen />);
  fireEvent.press(screen.getByRole('radio', { name: 'Avatar 2' }));
  fireEvent.press(screen.getByRole('button', { name: 'Save avatar' }));
  await waitFor(() => expect(screen.getByText(/could not save/i)).toBeTruthy());
  expect(screen.getByRole('radio', { name: 'Avatar 2, selected' })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Save avatar' }));
  await waitFor(() => expect(screen.getByText('Avatar saved')).toBeTruthy());
  expect(mockUpdateAvatar).toHaveBeenCalledTimes(2);
});
