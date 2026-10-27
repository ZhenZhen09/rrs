import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockSaveSession = jest.fn();
const mockSaveUserData = jest.fn();
const mockGetTasks = jest.fn();
const mockFetchQuery = jest.fn();
const mockUnregisterFcmToken = jest.fn();

jest.mock('@/utils/api', () => ({ api: { post: (...args: unknown[]) => mockPost(...args), patch: (...args: unknown[]) => mockPatch(...args) }, setAuthFailureListener: jest.fn(), resetAuthStatus: jest.fn() }));
jest.mock('@/utils/AuthManager', () => ({ AuthManager: {
  shouldRestoreSession: jest.fn().mockResolvedValue(false), clearSession: jest.fn().mockResolvedValue(undefined),
  saveSession: (...args: unknown[]) => mockSaveSession(...args), saveUserData: (...args: unknown[]) => mockSaveUserData(...args),
  getAccessToken: jest.fn().mockResolvedValue('access'),
} }));
jest.mock('@/services/apiService', () => ({ getTasks: (...args: unknown[]) => mockGetTasks(...args) }));
jest.mock('@/services/pushTokenService', () => ({ unregisterFcmToken: (...args: unknown[]) => mockUnregisterFcmToken(...args) }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { fetchQuery: (...args: unknown[]) => mockFetchQuery(...args) } }));
jest.mock('expo-router', () => ({ useRootNavigationState: () => ({ key: 'ready' }), useRouter: () => ({ replace: jest.fn() }), useSegments: () => ['(tabs)'] }));

function Harness() {
  const { user, login, logout, updateAvatar } = useAuth();
  return <>
    <Text testID="saved-avatar">{user?.avatar_id ?? 'none'}</Text>
    <TouchableOpacity testID="login" onPress={() => void login('alex@example.com', '1234', true)} />
    <TouchableOpacity testID="save-avatar" onPress={() => void updateAvatar('avatar_03').catch(() => undefined)} />
    <TouchableOpacity testID="logout" onPress={() => void logout()} />
  </>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockResolvedValue({ data: { id: 'rider-1', name: 'Alex Rider', avatar_id: 'avatar_01', token: 'access', refreshToken: 'refresh' } });
  mockSaveSession.mockResolvedValue(undefined);
  mockSaveUserData.mockResolvedValue(undefined);
  mockGetTasks.mockResolvedValue([]);
  mockFetchQuery.mockImplementation(({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn());
  mockUnregisterFcmToken.mockResolvedValue(undefined);
});

it('updates the profile only after the avatar API confirms and persists it', async () => {
  let finish!: (value: unknown) => void;
  mockPatch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><Harness /></AuthProvider>);
  await act(async () => fireEvent.press(screen.getByTestId('login')));
  expect(mockFetchQuery).not.toHaveBeenCalled();
  expect(screen.getByTestId('saved-avatar')).toHaveTextContent('avatar_01');
  fireEvent.press(screen.getByTestId('save-avatar'));
  expect(screen.getByTestId('saved-avatar')).toHaveTextContent('avatar_01');
  expect(mockPatch).toHaveBeenCalledWith('/api/users/me/avatar', { avatar_id: 'avatar_03' });
  await act(async () => finish({ data: { avatar_id: 'avatar_03' } }));
  await waitFor(() => expect(screen.getByTestId('saved-avatar')).toHaveTextContent('avatar_03'));
  expect(mockSaveUserData).toHaveBeenCalledWith(expect.objectContaining({ avatar_id: 'avatar_03' }));
});

it('keeps the saved profile when the API rejects the update', async () => {
  mockPatch.mockRejectedValue(new Error('offline'));
  render(<AuthProvider><Harness /></AuthProvider>);
  await act(async () => fireEvent.press(screen.getByTestId('login')));
  await act(async () => fireEvent.press(screen.getByTestId('save-avatar')));
  expect(screen.getByTestId('saved-avatar')).toHaveTextContent('avatar_01');
  expect(mockSaveUserData).not.toHaveBeenCalled();
});

it('unregisters the rider FCM token before clearing the session on logout', async () => {
  render(<AuthProvider><Harness /></AuthProvider>);
  await act(async () => fireEvent.press(screen.getByTestId('login')));
  await act(async () => fireEvent.press(screen.getByTestId('logout')));

  expect(mockUnregisterFcmToken).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenLastCalledWith('/api/auth/logout', { userId: 'rider-1' });
});
