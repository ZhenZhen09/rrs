// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { getWebPushStatus, enableWebPush, disableWebPush } = vi.hoisted(() => ({
  getWebPushStatus: vi.fn(), enableWebPush: vi.fn(), disableWebPush: vi.fn(),
}));
vi.mock('../../utils/webPush', () => ({ getWebPushStatus, enableWebPush, disableWebPush }));

import { WebPushSettings } from '../WebPushSettings';

describe('WebPushSettings', () => {
  beforeEach(() => {
    getWebPushStatus.mockReset().mockResolvedValue({ state: 'disabled', subscribed: false, enabled: true });
    enableWebPush.mockReset().mockResolvedValue(undefined);
    disableWebPush.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('does not request permission when the settings are rendered', async () => {
    render(<WebPushSettings fetchWithAuth={vi.fn()} />);
    await screen.findByRole('button', { name: 'Enable browser notifications' });

    expect(enableWebPush).not.toHaveBeenCalled();
  });

  it('enables only after the explicit action and refreshes the device state', async () => {
    getWebPushStatus.mockResolvedValueOnce({ state: 'disabled', enabled: true, subscribed: false })
      .mockResolvedValueOnce({ state: 'subscribed', enabled: true, subscribed: true });
    render(<WebPushSettings fetchWithAuth={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable browser notifications' }));

    await screen.findByRole('button', { name: 'Disable browser notifications' });
    expect(enableWebPush).toHaveBeenCalledTimes(1);
    expect(getWebPushStatus).toHaveBeenCalledTimes(2);
  });

  it('shows unavailable and denied states without offering a repeated enable prompt', async () => {
    getWebPushStatus.mockResolvedValueOnce({ state: 'unsupported', enabled: false, subscribed: false });
    render(<WebPushSettings fetchWithAuth={vi.fn()} />);
    expect(await screen.findByText(/does not support browser push/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enable browser notifications' })).toBeNull();

    cleanup();
    getWebPushStatus.mockResolvedValueOnce({ state: 'permission-denied', enabled: true, subscribed: false });
    render(<WebPushSettings fetchWithAuth={vi.fn()} />);
    expect(await screen.findByText(/blocked in browser or device settings/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enable browser notifications' })).toBeNull();
  });
});
