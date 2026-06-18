import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiderMap } from '../RiderMap';
import { RealTimeProvider } from '../../../context/RealTimeContext';
import { AuthProvider } from '../../../context/AuthContext';
import React from 'react';

// Mock the real-time context to simulate a logged-in rider with health metrics
vi.mock('../../../context/RealTimeContext', () => ({
  useRealTime: () => ({
    socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    riderPresence: { 'rider_c0dabf98': 'online' },
    riderLocations: { 
      'rider_c0dabf98': { lat: 14.129, lng: 121.259, timestamp: Date.now() } 
    }
  }),
  RealTimeProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock the global fetch to return our test rider data
const mockRider = {
  id: 'rider_c0dabf98',
  name: 'Test Rider',
  email: 'test@rider.com',
  is_on_duty: true,
  last_battery_level: 85,
  last_signal_strength: 'LTE',
  is_online: true,
  current_lat: 14.129,
  current_lng: 121.259,
  request_id: 'req_123',
  delivery_status: 'in_progress',
  pickup_address: 'Main Office'
};

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([mockRider]),
  })
) as any;

describe('Rider Map Transparency Unit Test', () => {
  it('✅ should display rider health metrics (Battery, Signal, Duty)', async () => {
    render(
      <AuthProvider>
        <RiderMap />
      </AuthProvider>
    );

    // 1. Check if rider name is visible
    const riderName = await screen.findByText('Test Rider');
    expect(riderName).toBeDefined();

    // 2. Check for Battery Percentage
    const batteryText = await screen.findByText('85%');
    expect(batteryText).toBeDefined();

    // 3. Check for Signal Strength
    const signalText = await screen.findByText('LTE');
    expect(signalText).toBeDefined();

    // 4. Check for On-Duty Status
    const dutyBadge = await screen.findByText('On Duty');
    expect(dutyBadge).toBeDefined();

    // 5. Check for Active Task Details (Restored Feature)
    const requestId = await screen.findByText(/#REQ_123/i);
    expect(requestId).toBeDefined();
  });

  it('✅ should show "OFF DUTY" label when rider shift is toggled off', async () => {
    // Override mock for off-duty scenario
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ ...mockRider, is_on_duty: false }]),
      })
    ) as any;

    render(
      <AuthProvider>
        <RiderMap />
      </AuthProvider>
    );

    const offDutyBadge = await screen.findByText('OFF DUTY');
    expect(offDutyBadge).toBeDefined();
  });
});
