import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';

let mockConnectionState: 'checking' | 'online' | 'no_network' | 'service_unavailable' = 'online';
const mockRetry = jest.fn();

jest.mock('@/context/ConnectionContext', () => ({
  useConnection: () => ({ state: mockConnectionState, retry: mockRetry }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockRetry.mockClear();
  });

  it('distinguishes no internet from an unreachable Errands service', () => {
    mockConnectionState = 'no_network';
    const disconnected = render(<OfflineBanner />);
    expect(disconnected.getByText('No Internet Connection')).toBeTruthy();
    expect(disconnected.getByText(/new assignments and important updates may be delayed/i)).toBeTruthy();
    disconnected.unmount();

    mockConnectionState = 'service_unavailable';
    const unavailable = render(<OfflineBanner />);
    expect(unavailable.getByText('Cannot reach Errands')).toBeTruthy();
  });

  it('offers a retry action', () => {
    mockConnectionState = 'no_network';
    const screen = render(<OfflineBanner />);
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
