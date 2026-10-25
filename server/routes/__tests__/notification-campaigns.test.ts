import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { query, getConnection, logAction, sendPushNotification } = vi.hoisted(() => ({
  query: vi.fn(), getConnection: vi.fn(), logAction: vi.fn(), sendPushNotification: vi.fn(),
}));
vi.mock('../../db', () => ({ pool: { query, getConnection } }));
vi.mock('../../services/auditLogger', () => ({ logAction }));
vi.mock('../notifications', () => ({ sendPushNotification }));

import notificationCampaignRoutes from '../notificationCampaigns';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.user = { id: 'admin-1', role: req.headers['x-role'] || 'admin' };
  next();
});
app.use('/api/notification-campaigns', notificationCampaignRoutes);

describe('notification campaign routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue([[]]);
  });

  it('allows only administrators to access campaigns', async () => {
    const response = await request(app).get('/api/notification-campaigns').set('x-role', 'rider');
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects an invalid recurring campaign before opening a transaction', async () => {
    const response = await request(app).post('/api/notification-campaigns').send({
      name: 'Morning reminder', notification_title: 'Start shift', notification_body: 'Please start your shift.',
      target_type: 'all_riders', schedule_type: 'recurring', start_date: '2026-10-25', end_date: null,
      send_time: '08:00', weekdays: [], repeat_interval_minutes: 10, max_sends_per_rider: 3,
      destination: 'shift', rider_ids: [],
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('weekday');
    expect(getConnection).not.toHaveBeenCalled();
  });

  it('returns campaign summaries with normalized counts and weekdays', async () => {
    query.mockResolvedValueOnce([[{
      id: 'campaign-1', name: 'Morning', status: 'draft', weekdays: '[1,2,3,4,5]',
      recipient_count: '2', delivery_count: '0',
    }]]);
    const response = await request(app).get('/api/notification-campaigns');
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ weekdays: [1, 2, 3, 4, 5], recipient_count: 2, delivery_count: 0 });
  });
});
