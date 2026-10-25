import { describe, expect, it, vi } from 'vitest';
import { ensureNotificationCampaignTables, getInitialCampaignRun, getNextCampaignRun, newCampaignId } from '../notificationCampaigns';

describe('notification campaign storage', () => {
  it('creates campaign, recipient, and delivery tables', async () => {
    const query = vi.fn().mockResolvedValue([[]]);
    await ensureNotificationCampaignTables({ query });
    const ddl = query.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaigns');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaign_recipients');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaign_deliveries');
    expect(ddl).toContain('uq_campaign_delivery_idempotency');
    expect(ddl).toContain('notification_campaign_worker_state');
  });

  it('calculates Philippine recurring runs and repeat limits', () => {
    const campaign = {
      schedule_type: 'recurring' as const, start_date: '2026-10-26', end_date: '2026-10-30', send_time: '08:00',
      weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: 10, max_sends_per_rider: 3,
    };
    const first = getInitialCampaignRun(campaign, new Date('2026-10-25T23:00:00Z'));
    expect(first).toBe('2026-10-26 08:00:00');
    expect(getNextCampaignRun(campaign, first!, 1)).toBe('2026-10-26 08:10:00');
    expect(getNextCampaignRun(campaign, '2026-10-26 08:20:00', 3)).toBe('2026-10-27 08:00:00');
  });

  it('rejects expired one-time schedules', () => {
    expect(getInitialCampaignRun({ schedule_type: 'one_time', start_date: '2026-10-25', send_time: '08:00', max_sends_per_rider: 1 },
      new Date('2026-10-25T01:00:00Z'))).toBeNull();
  });

  it('generates namespaced campaign IDs', () => {
    expect(newCampaignId()).toMatch(/^campaign_[0-9a-f-]{36}$/);
  });
});
