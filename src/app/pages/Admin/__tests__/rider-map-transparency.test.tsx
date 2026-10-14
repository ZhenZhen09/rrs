// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { RiderMap } from '../RiderMap';

// Map rendering is outside these health-metric assertions; retain the actual RiderMap UI.
vi.mock('react-leaflet', async () => {
  const { forwardRef } = await import('react');
  return {
    MapContainer: forwardRef<HTMLDivElement, PropsWithChildren>(({ children }, ref) => <div ref={ref}>{children}</div>),
    TileLayer: () => null,
    // Leaflet popup contents are not visible before a marker is opened.
    Marker: () => null,
    Popup: () => null,
    useMap: () => ({ flyTo: vi.fn(), getZoom: () => 13 }),
  };
});
vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([mockRider]),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Rider Map Transparency Unit Test', () => {
  it('✅ should display rider health metrics (Battery, Signal, Duty)', async () => {
    render(
      <RiderMap />
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
    const dutyBadges = await screen.findAllByText('On Duty');
    expect(dutyBadges.length).toBeGreaterThan(0);

    // 5. Check for Active Task Details (Restored Feature)
    const requestIds = await screen.findAllByText(/#EQ_123/i);
    expect(requestIds.length).toBeGreaterThan(0);
  });

  it('✅ should show "OFF DUTY" label when rider shift is toggled off', async () => {
    // Override mock for off-duty scenario
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ ...mockRider, is_on_duty: false }]),
      }));

    render(
      <RiderMap />
    );

    const offDutyBadge = await screen.findByText('OFF DUTY');
    expect(offDutyBadge).toBeDefined();
  });
});
