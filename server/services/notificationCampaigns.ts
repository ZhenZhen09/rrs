import crypto from 'crypto';
import { addPhilippineDays, getPhilippineDateTime } from './shiftSchedule';

export type CampaignDb = { query: (sql: string, values?: any[]) => Promise<any> };

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] as const;
export const CAMPAIGN_TARGETS = ['all_riders', 'selected_riders', 'no_attendance', 'present', 'absent_or_leave', 'on_duty', 'off_duty', 'active_tasks', 'overdue_tasks'] as const;
export const CAMPAIGN_DESTINATIONS = ['dashboard', 'shift', 'today', 'overdue', 'inbox'] as const;

export async function ensureNotificationCampaignTables(db: CampaignDb): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    notification_title VARCHAR(120) NOT NULL,
    notification_body VARCHAR(500) NOT NULL,
    status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
    target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
    schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
    start_date DATE NOT NULL,
    end_date DATE NULL,
    send_time TIME NOT NULL,
    time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
    weekdays JSON NULL,
    repeat_interval_minutes INT NULL,
    max_sends_per_rider INT NOT NULL DEFAULT 1,
    destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
    next_run_at DATETIME NULL,
    last_run_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_by VARCHAR(191) NOT NULL,
    updated_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_campaign_status_start (status, start_date, send_time)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
    campaign_id VARCHAR(64) NOT NULL,
    rider_id VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, rider_id),
    CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL,
    rider_id VARCHAR(191) NOT NULL,
    scheduled_at DATETIME NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
    provider_message_id VARCHAR(255) NULL,
    notification_id VARCHAR(64) NULL,
    failure_reason VARCHAR(500) NULL,
    idempotency_key VARCHAR(191) NOT NULL,
    sent_at DATETIME NULL,
    action_type VARCHAR(32) NULL,
    acted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
    INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
    CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_worker_state (
    worker_key VARCHAR(64) PRIMARY KEY,
    last_started_at DATETIME NULL,
    last_completed_at DATETIME NULL,
    last_status VARCHAR(16) NOT NULL DEFAULT 'idle',
    last_error VARCHAR(500) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  const [campaignColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaigns'
      AND COLUMN_NAME IN ('next_run_at','last_run_at','completed_at')`);
  const existingCampaignColumns = new Set((campaignColumns as any[]).map(row => row.COLUMN_NAME));
  if (!existingCampaignColumns.has('next_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN next_run_at DATETIME NULL');
  if (!existingCampaignColumns.has('last_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN last_run_at DATETIME NULL');
  if (!existingCampaignColumns.has('completed_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN completed_at DATETIME NULL');
  const [deliveryColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaign_deliveries'
      AND COLUMN_NAME IN ('notification_id','action_type','acted_at')`);
  const existingDeliveryColumns = new Set((deliveryColumns as any[]).map(row => row.COLUMN_NAME));
  if (!existingDeliveryColumns.has('notification_id')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN notification_id VARCHAR(64) NULL');
  if (!existingDeliveryColumns.has('action_type')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN action_type VARCHAR(32) NULL');
  if (!existingDeliveryColumns.has('acted_at')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN acted_at DATETIME NULL');
}

export function newCampaignId(): string {
  return `campaign_${crypto.randomUUID()}`;
}

export type CampaignSchedule = {
  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date?: string | null;
  send_time: string; weekdays?: number[] | string | null; repeat_interval_minutes?: number | null; max_sends_per_rider: number;
};

const mysqlNow = (now: Date) => {
  const ph = getPhilippineDateTime(now);
  return `${ph.date} ${ph.time}:00`;
};
const weekday = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};
const parseWeekdays = (value: CampaignSchedule['weekdays']): number[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try { return JSON.parse(value); } catch { return []; }
};

export function getInitialCampaignRun(campaign: CampaignSchedule, now: Date = new Date()): string | null {
  if (campaign.schedule_type === 'immediate') return mysqlNow(now);
  const current = getPhilippineDateTime(now);
  if (campaign.schedule_type === 'one_time') {
    const run = `${campaign.start_date} ${campaign.send_time.slice(0, 5)}:00`;
    return run >= mysqlNow(now) ? run : null;
  }
  const days = new Set(parseWeekdays(campaign.weekdays));
  let date = campaign.start_date > current.date ? campaign.start_date : current.date;
  for (let offset = 0; offset < 370; offset++, date = addPhilippineDays(date, 1)) {
    if (campaign.end_date && date > campaign.end_date) return null;
    const run = `${date} ${campaign.send_time.slice(0, 5)}:00`;
    if (days.has(weekday(date)) && run >= mysqlNow(now)) return run;
  }
  return null;
}

export function getNextCampaignRun(campaign: CampaignSchedule, previousRun: string, runsOnDate: number): string | null {
  const date = previousRun.slice(0, 10);
  if (campaign.repeat_interval_minutes && runsOnDate < campaign.max_sends_per_rider) {
    const utc = Date.parse(`${previousRun.replace(' ', 'T')}+08:00`) + campaign.repeat_interval_minutes * 60_000;
    const next = getPhilippineDateTime(new Date(utc));
    return `${next.date} ${next.time}:00`;
  }
  if (campaign.schedule_type !== 'recurring') return null;
  const days = new Set(parseWeekdays(campaign.weekdays));
  let nextDate = addPhilippineDays(date, 1);
  for (let offset = 0; offset < 370; offset++, nextDate = addPhilippineDays(nextDate, 1)) {
    if (campaign.end_date && nextDate > campaign.end_date) return null;
    if (days.has(weekday(nextDate))) return `${nextDate} ${campaign.send_time.slice(0, 5)}:00`;
  }
  return null;
}
