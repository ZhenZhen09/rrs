import crypto from 'crypto';
import type { Server } from 'socket.io';
import { pool } from '../db';
import { sendPushNotification } from '../routes/notifications';
import { getNextCampaignRun } from './notificationCampaigns';
import { getPhilippineDateTime } from './shiftSchedule';

type Campaign = {
  id: string; notification_title: string; notification_body: string; target_type: string;
  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string | null;
  send_time: string; weekdays: string | number[] | null; repeat_interval_minutes: number | null;
  max_sends_per_rider: number; destination: string; next_run_at: string;
};

const riderIdEquals = (left: string, right: string) => `CONVERT(${left} USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(${right} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
const activeTask = `EXISTS (SELECT 1 FROM delivery_requests dr WHERE ${riderIdEquals('dr.assigned_rider_id', 'u.id')}
  AND dr.delivery_status NOT IN ('completed','delivered','failed','cancelled','disapproved'))`;

function eligibilitySql(target: string): string {
  switch (target) {
    case 'selected_riders': return 'EXISTS (SELECT 1 FROM notification_campaign_recipients cr WHERE cr.campaign_id=? AND CONVERT(cr.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(u.id USING utf8mb4) COLLATE utf8mb4_unicode_ci)';
    case 'no_attendance': return `NOT EXISTS (SELECT 1 FROM attendance_logs al WHERE ${riderIdEquals('al.rider_id', 'u.id')} AND al.date=?)`;
    case 'present': return `EXISTS (SELECT 1 FROM attendance_logs al WHERE ${riderIdEquals('al.rider_id', 'u.id')} AND al.date=? AND al.status='present')`;
    case 'absent_or_leave': return `EXISTS (SELECT 1 FROM attendance_logs al WHERE ${riderIdEquals('al.rider_id', 'u.id')} AND al.date=? AND al.status IN ('absent','on_leave'))`;
    case 'on_duty': return 'u.is_on_duty=TRUE';
    case 'off_duty': return 'u.is_on_duty=FALSE';
    case 'active_tasks': return activeTask;
    case 'overdue_tasks': return `${activeTask} AND EXISTS (SELECT 1 FROM delivery_requests odr WHERE ${riderIdEquals('odr.assigned_rider_id', 'u.id')}
      AND odr.delivery_status NOT IN ('completed','delivered','failed','cancelled','disapproved')
      AND (odr.delivery_date < ? OR odr.scheduled_end_at < NOW()))`;
    default: return '1=1';
  }
}

async function eligibleRiders(campaign: Campaign, scheduledAt: string): Promise<Array<{ id: string; name: string }>> {
  const date = scheduledAt.slice(0, 10);
  const predicate = eligibilitySql(campaign.target_type);
  const predicateParams = campaign.target_type === 'selected_riders' ? [campaign.id]
    : ['no_attendance', 'present', 'absent_or_leave', 'overdue_tasks'].includes(campaign.target_type) ? [date] : [];
  const [rows] = await pool.query(`SELECT u.id,u.name FROM users u WHERE u.role='rider' AND (u.status IS NULL OR u.status <> 'inactive')
    AND ${predicate}
    AND (SELECT COUNT(*) FROM notification_campaign_deliveries d WHERE d.campaign_id=? AND ${riderIdEquals('d.rider_id', 'u.id')}
      AND DATE(d.scheduled_at)=? AND d.status IN ('processing','sent','failed')) < ?
    ORDER BY u.id LIMIT 2000`, [...predicateParams, campaign.id, date, campaign.max_sends_per_rider]);
  return rows as Array<{ id: string; name: string }>;
}

async function reserveDelivery(campaign: Campaign, rider: { id: string }, scheduledAt: string): Promise<{ deliveryId: string; notificationId: string } | null> {
  const conn = await pool.getConnection();
  const deliveryId = `campaign_delivery_${crypto.randomUUID()}`;
  const notificationId = `notif_${crypto.randomUUID()}`;
  const idempotencyKey = `${campaign.id}:${rider.id}:${scheduledAt}`;
  try {
    await conn.beginTransaction();
    await conn.query(`INSERT INTO notification_campaign_deliveries
      (id,campaign_id,rider_id,scheduled_at,attempt_number,status,notification_id,idempotency_key)
      VALUES (?,?,?,?,1,'processing',?,?)`, [deliveryId, campaign.id, rider.id, scheduledAt, notificationId, idempotencyKey]);
    await conn.query(`INSERT INTO notifications (id,user_id,message,type,request_id)
      VALUES (?,?,?,'campaign',NULL)`, [notificationId, rider.id, campaign.notification_body]);
    await conn.commit();
    return { deliveryId, notificationId };
  } catch (error: any) {
    await conn.rollback();
    if (error?.code === 'ER_DUP_ENTRY') return null;
    throw error;
  } finally { conn.release(); }
}

async function deliver(campaign: Campaign, riderId: string, deliveryId: string, notificationId: string, io?: Server) {
  try {
    io?.to(riderId).emit('notification-added', {
      id: notificationId, user_id: riderId, message: campaign.notification_body, type: 'campaign', campaign_id: campaign.id,
    });
    const result = await sendPushNotification(riderId, campaign.notification_title, campaign.notification_body, {
      type: 'campaign', campaignId: campaign.id, notificationId, destination: campaign.destination,
    }, { channelId: 'delivery_updates', tag: `campaign:${campaign.id}` });
    await pool.query(`UPDATE notification_campaign_deliveries SET status=?,provider_message_id=?,failure_reason=?,sent_at=? WHERE id=?`, [
      result.sent ? 'sent' : 'failed', result.providerMessageId || null, result.reason?.slice(0, 500) || null,
      result.sent ? new Date() : null, deliveryId,
    ]);
  } catch (error) {
    await pool.query(`UPDATE notification_campaign_deliveries SET status='failed',failure_reason=? WHERE id=?`, [
      String(error instanceof Error ? error.message : error).slice(0, 500), deliveryId,
    ]);
  }
}

function runNumber(campaign: Campaign, scheduledAt: string): number {
  if (!campaign.repeat_interval_minutes) return 1;
  const base = Date.parse(`${scheduledAt.slice(0, 10)}T${campaign.send_time.slice(0, 5)}:00+08:00`);
  const actual = Date.parse(`${scheduledAt.replace(' ', 'T')}+08:00`);
  return Math.max(1, Math.floor((actual - base) / (campaign.repeat_interval_minutes * 60_000)) + 1);
}

export async function processDueNotificationCampaigns(io?: Server, now: Date = new Date()): Promise<number> {
  const ph = getPhilippineDateTime(now);
  const localNow = `${ph.date} ${ph.time}:00`;
  await pool.query(`UPDATE notification_campaign_deliveries SET status='pending',failure_reason='Recovered stale worker reservation'
    WHERE status='processing' AND created_at < DATE_SUB(NOW(),INTERVAL 10 MINUTE)`);
  const [rows] = await pool.query(`SELECT * FROM notification_campaigns
    WHERE status='active' AND next_run_at IS NOT NULL AND next_run_at <= ? ORDER BY next_run_at LIMIT 25`, [localNow]);
  let processed = 0;
  for (const campaign of rows as Campaign[]) {
    const scheduledAt = String(campaign.next_run_at).slice(0, 19);
    const riders = await eligibleRiders(campaign, scheduledAt);
    for (const rider of riders) {
      const reservation = await reserveDelivery(campaign, rider, scheduledAt);
      if (!reservation) continue;
      await deliver(campaign, rider.id, reservation.deliveryId, reservation.notificationId, io);
    }
    const nextRun = getNextCampaignRun(campaign, scheduledAt, runNumber(campaign, scheduledAt));
    await pool.query(`UPDATE notification_campaigns SET last_run_at=?,next_run_at=?,status=?,completed_at=?
      WHERE id=? AND status='active' AND next_run_at=?`, [scheduledAt, nextRun,
      nextRun ? 'active' : 'completed', nextRun ? null : localNow, campaign.id, campaign.next_run_at]);
    processed++;
  }
  return processed;
}

export async function retryFailedCampaignDeliveries(io?: Server): Promise<number> {
  const [rows] = await pool.query(`SELECT d.id delivery_id,d.rider_id,d.notification_id,d.attempt_number,
    c.id,c.notification_title,c.notification_body,c.destination
    FROM notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
    WHERE d.status='failed' AND d.attempt_number < 3 AND d.created_at <= DATE_SUB(NOW(),INTERVAL d.attempt_number MINUTE)
    ORDER BY d.created_at LIMIT 50`);
  for (const row of rows as any[]) {
    const [result]: any = await pool.query(`UPDATE notification_campaign_deliveries SET status='processing',attempt_number=attempt_number+1
      WHERE id=? AND status='failed'`, [row.delivery_id]);
    if (!result.affectedRows) continue;
    await deliver(row as Campaign, row.rider_id, row.delivery_id, row.notification_id, io);
  }
  return (rows as any[]).length;
}

export async function reconcileCampaignActions(): Promise<void> {
  await pool.query(`UPDATE notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
    JOIN attendance_logs al ON CONVERT(al.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(d.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND al.check_in_time >= d.sent_at
    SET d.action_type=CASE WHEN al.status='present' THEN 'attendance_present' ELSE CONCAT('attendance_',al.status) END,
        d.acted_at=al.check_in_time
    WHERE d.status='sent' AND d.acted_at IS NULL AND c.destination IN ('dashboard','shift')`);
  await pool.query(`UPDATE notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
    JOIN delivery_requests dr ON CONVERT(dr.assigned_rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(d.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND dr.delivery_status IN ('completed','delivered') AND dr.updated_at >= d.sent_at
    SET d.action_type='task_completed',d.acted_at=dr.updated_at
    WHERE d.status='sent' AND d.acted_at IS NULL AND c.destination IN ('today','overdue')`);
}

export function startNotificationCampaignWorker(io?: Server): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    const [lockRows]: any = await pool.query("SELECT GET_LOCK('notification_campaign_worker', 0) acquired");
    if (!lockRows[0]?.acquired) { running = false; return; }
    await pool.query(`INSERT INTO notification_campaign_worker_state (worker_key,last_started_at,last_status)
      VALUES ('campaign_dispatch',NOW(),'running') ON DUPLICATE KEY UPDATE last_started_at=NOW(),last_status='running',last_error=NULL`);
    try {
      await processDueNotificationCampaigns(io);
      await retryFailedCampaignDeliveries(io);
      await reconcileCampaignActions();
      await pool.query("DELETE FROM notification_campaign_deliveries WHERE created_at < DATE_SUB(NOW(),INTERVAL 180 DAY)");
      await pool.query(`UPDATE notification_campaign_worker_state SET last_completed_at=NOW(),last_status='healthy',last_error=NULL
        WHERE worker_key='campaign_dispatch'`);
    } catch (error) {
      console.error('[NOTIFICATION CAMPAIGNS] Worker pass failed:', error);
      await pool.query(`UPDATE notification_campaign_worker_state SET last_completed_at=NOW(),last_status='error',last_error=?
        WHERE worker_key='campaign_dispatch'`, [String(error instanceof Error ? error.message : error).slice(0, 500)]).catch(() => undefined);
    } finally {
      await pool.query("SELECT RELEASE_LOCK('notification_campaign_worker')").catch(() => undefined);
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), 60_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
