import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getConnection: vi.fn(),
  sendPushNotification: vi.fn(),
  overdueNotifiedAt: null as Date | null,
  overdueReminderAlreadySent: false,
  atRiskNotifiedAt: null as Date | null,
}));

vi.mock('../../db', () => ({
  pool: { query: mocks.poolQuery, getConnection: mocks.getConnection },
}));

vi.mock('../../routes/notifications', () => ({
  sendPushNotification: mocks.sendPushNotification,
}));

import { processProactiveOverdueAlerts } from '../proactiveOverdue';

const request = {
  request_id: 'req_53203889',
  status: 'approved',
  delivery_status: 'in_progress',
  delivery_date: '2026-10-06',
  time_window: '10:00 - 11:00',
  scheduled_end_at: '2026-10-06 11:00:00',
  assigned_rider_id: 'rider-1',
  requester_id: 'requester-1',
};

const io = {
  to: vi.fn(() => ({ emit: vi.fn() })),
} as any;

function createConnection() {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return [[{
          ...request,
          overdue_notified_at: mocks.overdueNotifiedAt,
          at_risk_notified_at: mocks.atRiskNotifiedAt,
        }], []];
      }
      if (sql.includes('SELECT id FROM notifications')) {
        return [mocks.overdueReminderAlreadySent ? [{ id: 'reminder-1' }] : [], []];
      }
      if (sql.includes('INSERT INTO notifications') && sql.includes('delivery_overdue_reminder')) {
        mocks.overdueReminderAlreadySent = true;
      }
      if (sql.includes('overdue_notified_at = ?')) mocks.overdueNotifiedAt = new Date();
      if (sql.includes('at_risk_notified_at = ?')) mocks.atRiskNotifiedAt = new Date();
      return [[], []];
    }),
  };
  return connection;
}

describe('proactive overdue mobile push alerts', () => {
  let connection: ReturnType<typeof createConnection>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T03:01:00.000Z'));
    vi.stubEnv('OVERDUE_WARNING_THRESHOLD_MINUTES', '30');
    mocks.overdueNotifiedAt = null;
    mocks.overdueReminderAlreadySent = false;
    mocks.atRiskNotifiedAt = null;
    mocks.sendPushNotification.mockReset().mockResolvedValue(undefined);
    connection = createConnection();
    mocks.getConnection.mockReset().mockResolvedValue(connection);
    mocks.poolQuery.mockReset().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT request_id')) return [[request], []];
      if (sql.includes('SELECT id FROM users')) return [[{ id: 'admin-1' }], []];
      return [[], []];
    });
    io.to.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('sends one overdue push to the assigned rider after committing and does not resend it', async () => {
    await processProactiveOverdueAlerts(io);
    await processProactiveOverdueAlerts(io);

    expect(mocks.sendPushNotification).toHaveBeenCalledExactlyOnceWith(
      'rider-1',
      'Delivery Overdue',
      'Delivery #203889 is overdue by 1 minute.',
      { request_id: 'req_53203889', type: 'delivery_overdue', notificationId: expect.stringMatching(/^notif_/) },
      { channelId: 'delivery_urgent', categoryId: 'DELIVERY_TASK', tag: 'delivery:req_53203889:delivery_overdue' },
    );
    expect(mocks.sendPushNotification.mock.invocationCallOrder[0])
      .toBeGreaterThan(connection.commit.mock.invocationCallOrder[0]);
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('sends an at-risk push to the assigned rider before the deadline', async () => {
    vi.setSystemTime(new Date('2026-10-06T02:30:00.000Z'));

    await processProactiveOverdueAlerts(io);

    expect(mocks.sendPushNotification).toHaveBeenCalledExactlyOnceWith(
      'rider-1',
      'Delivery at risk',
      'Delivery #203889 is at risk and due in 30 minutes.',
      { request_id: 'req_53203889', type: 'delivery_at_risk', notificationId: expect.stringMatching(/^notif_/) },
      { channelId: 'delivery_updates', categoryId: 'DELIVERY_TASK', tag: 'delivery:req_53203889:delivery_at_risk' },
    );
  });

  it('sends at most one overdue follow-up after two hours', async () => {
    mocks.overdueNotifiedAt = new Date('2026-10-06T03:00:00.000Z');
    vi.setSystemTime(new Date('2026-10-06T05:01:00.000Z'));

    await processProactiveOverdueAlerts(io);
    await processProactiveOverdueAlerts(io);

    expect(mocks.sendPushNotification).toHaveBeenCalledExactlyOnceWith(
      'rider-1',
      'Delivery overdue reminder',
      'Delivery #203889 is overdue by 2 hr 1 min.',
      { request_id: 'req_53203889', type: 'delivery_overdue_reminder', notificationId: expect.stringMatching(/^notif_/) },
      { channelId: 'delivery_urgent', categoryId: 'DELIVERY_TASK', tag: 'delivery:req_53203889:delivery_overdue_reminder' },
    );
  });
});
