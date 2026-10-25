import crypto from 'crypto';
import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';
import { logAction } from '../services/auditLogger';
import { CAMPAIGN_DESTINATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TARGETS, getInitialCampaignRun, newCampaignId } from '../services/notificationCampaigns';
import { sendPushNotification } from './notifications';

const router = Router();
router.use(authorize(['admin']));

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const campaignInput = z.object({
  name: z.string().trim().min(2).max(120),
  notification_title: z.string().trim().min(1).max(120),
  notification_body: z.string().trim().min(1).max(500),
  target_type: z.enum(CAMPAIGN_TARGETS),
  schedule_type: z.enum(['immediate', 'one_time', 'recurring']),
  start_date: z.string().regex(datePattern),
  end_date: z.string().regex(datePattern).nullable().optional(),
  send_time: z.string().regex(timePattern),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  repeat_interval_minutes: z.number().int().min(5).max(10080).nullable().optional(),
  max_sends_per_rider: z.number().int().min(1).max(20),
  destination: z.enum(CAMPAIGN_DESTINATIONS),
  rider_ids: z.array(z.string().min(1).max(64)).max(500).default([]),
}).superRefine((value, ctx) => {
  if (value.end_date && value.end_date < value.start_date) ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'End date must be on or after start date' });
  if (value.schedule_type === 'recurring' && value.weekdays.length === 0) ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Select at least one weekday' });
  if (value.target_type === 'selected_riders' && value.rider_ids.length === 0) ctx.addIssue({ code: 'custom', path: ['rider_ids'], message: 'Select at least one rider' });
});

const lifecycle: Record<string, { from: string[]; to: typeof CAMPAIGN_STATUSES[number] }> = {
  activate: { from: ['draft', 'paused'], to: 'active' },
  pause: { from: ['active', 'scheduled'], to: 'paused' },
  resume: { from: ['paused'], to: 'active' },
  cancel: { from: ['draft', 'scheduled', 'active', 'paused'], to: 'cancelled' },
};

function normalizeCampaign(row: any) {
  return {
    ...row,
    weekdays: typeof row.weekdays === 'string' ? JSON.parse(row.weekdays || '[]') : row.weekdays || [],
    recipient_count: Number(row.recipient_count || 0),
    delivery_count: Number(row.delivery_count || 0),
    sent_count: Number(row.sent_count || 0),
    failed_count: Number(row.failed_count || 0),
    skipped_count: Number(row.skipped_count || 0),
    pending_count: Number(row.pending_count || 0),
    acted_count: Number(row.acted_count || 0),
  };
}

async function getCampaign(id: string) {
  const [rows]: any = await pool.query(`SELECT c.*,
    (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE CONVERT(cr.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci) recipient_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci) delivery_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='sent') sent_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='failed') failed_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='skipped') skipped_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status IN ('pending','processing')) pending_count,
    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.acted_at IS NOT NULL) acted_count
    FROM notification_campaigns c WHERE c.id=? LIMIT 1`, [id]);
  if (!rows[0]) return null;
  const [recipients]: any = await pool.query(`SELECT u.id, u.name, u.email FROM notification_campaign_recipients cr
    JOIN users u ON CONVERT(u.id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(cr.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci WHERE cr.campaign_id=? ORDER BY u.name`, [id]);
  return { ...normalizeCampaign(rows[0]), recipients };
}

async function audit(req: AuthRequest, action: string, campaignId: string, oldValues: any, newValues: any) {
  await logAction({ actor_id: String(req.user!.id), actor_role: 'admin', action, resource_type: 'notification_campaign',
    resource_id: campaignId, old_values: oldValues, new_values: newValues,
    ip_address: req.ip, user_agent: req.get('user-agent') || undefined });
}

router.get('/riders', async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND (status IS NULL OR status <> 'inactive') ORDER BY name");
  res.json(rows);
});

router.get('/worker-health', async (_req: AuthRequest, res: Response) => {
  const [rows]: any = await pool.query("SELECT * FROM notification_campaign_worker_state WHERE worker_key='campaign_dispatch' LIMIT 1");
  res.json(rows[0] || { worker_key: 'campaign_dispatch', last_status: 'not_started' });
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(`SELECT c.*,
      (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE CONVERT(cr.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci) recipient_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci) delivery_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='sent') sent_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='failed') failed_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status='skipped') skipped_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.status IN ('pending','processing')) pending_count,
      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE CONVERT(cd.campaign_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND cd.acted_at IS NOT NULL) acted_count
      FROM notification_campaigns c ORDER BY c.updated_at DESC`);
    res.json(rows.map(normalizeCampaign));
  } catch (error) {
    console.error('Campaign list failed:', error);
    res.status(500).json({ error: 'Failed to load notification campaigns' });
  }
});

router.get('/:id/deliveries', async (req: AuthRequest, res: Response) => {
  const [rows] = await pool.query(`SELECT d.*, u.name rider_name, u.email rider_email
    FROM notification_campaign_deliveries d JOIN users u ON CONVERT(u.id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(d.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
    WHERE d.campaign_id=? ORDER BY d.created_at DESC LIMIT 500`, [String(req.params.id)]);
  res.json(rows);
});

router.get('/:id/export', async (req: AuthRequest, res: Response) => {
  const [rows]: any = await pool.query(`SELECT u.name rider_name,u.email rider_email,d.scheduled_at,d.attempt_number,
    d.status,d.provider_message_id,d.failure_reason,d.sent_at,d.action_type,d.acted_at
    FROM notification_campaign_deliveries d JOIN users u ON CONVERT(u.id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(d.rider_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
    WHERE d.campaign_id=? ORDER BY d.scheduled_at ASC,d.rider_id ASC`, [String(req.params.id)]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const columns = ['rider_name','rider_email','scheduled_at','attempt_number','status','provider_message_id','failure_reason','sent_at','action_type','acted_at'];
  const csv = [columns, ...rows.map((row: any) => columns.map(column => escape(row[column])))]
    .map(row => row.join(',')).join('\r\n');
  res.type('text/csv').attachment(`campaign-${String(req.params.id)}-deliveries.csv`).send(csv);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const campaign = await getCampaign(String(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = campaignInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
  const data = parsed.data;
  const id = newCampaignId();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`INSERT INTO notification_campaigns
      (id,name,notification_title,notification_body,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,'Asia/Manila',?,?,?,?,?,?)`, [id, data.name, data.notification_title, data.notification_body,
      data.target_type, data.schedule_type, data.start_date, data.end_date || null, data.send_time, JSON.stringify(data.weekdays),
      data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, req.user!.id]);
    for (const riderId of new Set(data.rider_ids)) {
      await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
        SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
    }
    await conn.commit();
    const created = await getCampaign(id);
    await audit(req, 'notification_campaign_created', id, null, created);
    res.status(201).json(created);
  } catch (error: any) {
    await conn.rollback();
    console.error('Campaign creation failed:', error);
    res.status(error?.code === 'ER_NO_REFERENCED_ROW_2' ? 400 : 500).json({ error: 'Failed to create notification campaign' });
  } finally { conn.release(); }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const parsed = campaignInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
  const previous = await getCampaign(id);
  if (!previous) return res.status(404).json({ error: 'Campaign not found' });
  if (!['draft', 'paused'].includes(previous.status)) return res.status(409).json({ error: 'Only draft or paused campaigns can be edited' });
  const data = parsed.data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE notification_campaigns SET name=?,notification_title=?,notification_body=?,target_type=?,schedule_type=?,
      start_date=?,end_date=?,send_time=?,weekdays=?,repeat_interval_minutes=?,max_sends_per_rider=?,destination=?,updated_by=? WHERE id=?`,
    [data.name, data.notification_title, data.notification_body, data.target_type, data.schedule_type, data.start_date, data.end_date || null,
      data.send_time, JSON.stringify(data.weekdays), data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, id]);
    await conn.query('DELETE FROM notification_campaign_recipients WHERE campaign_id=?', [id]);
    for (const riderId of new Set(data.rider_ids)) {
      await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
        SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
    }
    await conn.commit();
    const updated = await getCampaign(id);
    await audit(req, 'notification_campaign_updated', id, previous, updated);
    res.json(updated);
  } catch (error) {
    await conn.rollback();
    console.error('Campaign update failed:', error);
    res.status(500).json({ error: 'Failed to update notification campaign' });
  } finally { conn.release(); }
});

router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  const source = await getCampaign(String(req.params.id));
  if (!source) return res.status(404).json({ error: 'Campaign not found' });
  const id = newCampaignId();
  await pool.query(`INSERT INTO notification_campaigns
    (id,name,notification_title,notification_body,status,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
    SELECT ?,CONCAT(name,' (Copy)'),notification_title,notification_body,'draft',target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,?,?
    FROM notification_campaigns WHERE id=?`, [id, req.user!.id, req.user!.id, source.id]);
  await pool.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
    SELECT ?,rider_id FROM notification_campaign_recipients WHERE campaign_id=?`, [id, source.id]);
  const duplicate = await getCampaign(id);
  await audit(req, 'notification_campaign_duplicated', id, { source_id: source.id }, duplicate);
  res.status(201).json(duplicate);
});

router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  const campaign = await getCampaign(String(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const riderId = z.string().min(1).max(64).safeParse(req.body?.rider_id);
  if (!riderId.success) return res.status(400).json({ error: 'Select a rider for the test notification' });
  const [riders]: any = await pool.query("SELECT id, fcm_token, expo_push_token FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
  if (!riders[0]) return res.status(404).json({ error: 'Rider not found' });
  if (!riders[0].fcm_token && !riders[0].expo_push_token) return res.status(409).json({ error: 'The selected rider has no registered push device' });
  const notificationId = `notif_${crypto.randomUUID()}`;
  await pool.query(`INSERT INTO notifications (id,user_id,message,type,request_id) VALUES (?,? ,?,'campaign_test',NULL)`,
    [notificationId, riderId.data, `[TEST] ${campaign.notification_body}`]);
  req.app.get('io')?.to(riderId.data).emit('notification-added', { id: notificationId, message: `[TEST] ${campaign.notification_body}`, type: 'campaign_test' });
  await sendPushNotification(riderId.data, `[TEST] ${campaign.notification_title}`, campaign.notification_body,
    { type: 'campaign_test', campaignId: campaign.id, notificationId, destination: campaign.destination });
  await audit(req, 'notification_campaign_test_sent', campaign.id, null, { rider_id: riderId.data, notification_id: notificationId });
  res.json({ success: true, notification_id: notificationId });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const campaign = await getCampaign(id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'active' || campaign.status === 'scheduled') {
    return res.status(409).json({ error: 'Cancel the active campaign before deleting it' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM notification_campaign_deliveries WHERE campaign_id=?', [id]);
    await conn.query('DELETE FROM notification_campaign_recipients WHERE campaign_id=?', [id]);
    const [result]: any = await conn.query('DELETE FROM notification_campaigns WHERE id=?', [id]);
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ error: 'Campaign not found' });
    }
    await conn.commit();
    await audit(req, 'notification_campaign_deleted', id, campaign, null);
    res.status(204).send();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    console.error('Campaign deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete notification campaign' });
  } finally { conn.release(); }
});

for (const action of Object.keys(lifecycle)) {
  router.post(`/:id/${action}`, async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const transition = lifecycle[action];
      const previous = await getCampaign(id);
      if (!previous) return res.status(404).json({ error: 'Campaign not found' });
      if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
      const nextRun = ['activate', 'resume'].includes(action) ? getInitialCampaignRun(previous) : null;
      if (['activate', 'resume'].includes(action) && !nextRun) return res.status(409).json({ error: 'This campaign has no future scheduled delivery' });
      await pool.query('UPDATE notification_campaigns SET status=?,next_run_at=?,completed_at=NULL,updated_by=? WHERE id=? AND status=?',
        [transition.to, nextRun, req.user!.id, id, previous.status]);
      const updated = await getCampaign(id);
      const auditAction = action === 'cancel' ? 'notification_campaign_cancelled' : `notification_campaign_${action}d`;
      await audit(req, auditAction, id, { status: previous.status }, { status: transition.to, next_run_at: nextRun }).catch(error => {
        console.error('Campaign audit failed after successful transition:', error);
      });
      res.json(updated);
    } catch (error) {
      console.error(`Campaign ${action} failed:`, error);
      res.status(500).json({ error: `Failed to ${action} notification campaign` });
    }
  });
}

export default router;
