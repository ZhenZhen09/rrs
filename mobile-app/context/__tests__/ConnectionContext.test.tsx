import React from 'react';
import { AppState, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ConnectionProvider, useConnection } from '../ConnectionContext';

const mockNetInfoFetch = jest.fn();
const mockNetInfoSubscribe = jest.fn();
const mockApiGet = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
    addEventListener: (listener: (state: unknown) => void) => mockNetInfoSubscribe(listener),
  },
}));

jest.mock('@/utils/api', () => ({ api: { get: (...args: unknown[]) => mockApiGet(...args) } }));
jest.mock('@/services/SyncManager', () => ({ triggerSync: jest.fn() }));

function ConnectionValue() {
  const { state, retry } = useConnection();
  return <Text onPress={() => void retry()}>{state}</Text>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('ConnectionProvider', () => {
  beforeEach(() => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfoSubscribe.mockReturnValue(jest.fn());
    mockApiGet.mockReset();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ignores an older slow probe after a newer probe confirms service availability', async () => {
    const slowProbe = deferred<unknown>();
    const fastProbe = deferred<unknown>();
    mockApiGet.mockReturnValueOnce(slowProbe.promise).mockReturnValueOnce(fastProbe.promise);

    const screen = render(<ConnectionProvider><ConnectionValue /></ConnectionProvider>);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('checking'));
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));

    await act(async () => fastProbe.resolve({ data: { ok: true } }));
    await waitFor(() => expect(screen.getByText('online')).toBeTruthy());

    await act(async () => slowProbe.reject(new Error('old request timed out')));
    expect(screen.getByText('online')).toBeTruthy();
  });
});
