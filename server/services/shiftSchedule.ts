import { pool } from '../db';

type Db = { query: (sql: string, values?: any[]) => Promise<any> };

export type ScheduleRevision = {
  effective_date: string; start_time: string; end_time: string; grace_minutes: number;
  actor_id: string;
  created_at: string;
};

export type ShiftPolicy = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  cutoffAt: string | null;
  canStart: boolean;
  canWork: boolean;
  nextStartAt: string | null;
  active: boolean;
  window: 'unconfigured' | 'early' | 'open' | 'ended';
};

export type AutomaticShiftCloseSetting = { enabled: boolean; changed_at: string | null; changed_by: string | null };

const phFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function getPhilippineDateTime(now: Date): { date: string; time: string } {
  const parts = Object.fromEntries(phFormatter.formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function addPhilippineDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function evaluateShiftWindow(time: string, start: string, end: string): 'early' | 'open' | 'ended' {
  if (time < start) return 'early';
  if (time >= end) return 'ended';
  return 'open';
}

export function validScheduleTimes(start: unknown, end: unknown): start is string {
  return typeof start === 'string' && typeof end === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(start)
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(end)
    && start < end;
}

export function validGraceMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 120;
}

function minutesFromTime(value: string): number { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; }

export async function ensureShiftScheduleTables(db: Db = pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    changed_by VARCHAR(255) NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  const [settingColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings'
      AND COLUMN_NAME IN ('setting_value', 'changed_by', 'changed_at')`);
  const existingSettingColumns = new Set((settingColumns as any[]).map(row => row.COLUMN_NAME));
  if (!existingSettingColumns.has('setting_value')) await db.query("ALTER TABLE system_settings ADD COLUMN setting_value VARCHAR(255) NOT NULL DEFAULT '1'");
  if (!existingSettingColumns.has('changed_by')) await db.query('ALTER TABLE system_settings ADD COLUMN changed_by VARCHAR(255) NULL');
  if (!existingSettingColumns.has('changed_at')) await db.query('ALTER TABLE system_settings ADD COLUMN changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await db.query(`CREATE TABLE IF NOT EXISTS shift_schedule_revisions (
    effective_date DATE NOT NULL PRIMARY KEY,
    start_time CHAR(5) NOT NULL,
    end_time CHAR(5) NOT NULL,
    grace_minutes TINYINT UNSIGNED NOT NULL DEFAULT 15,
    actor_id VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const [scheduleColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shift_schedule_revisions' AND COLUMN_NAME = 'grace_minutes'`);
  if (!(scheduleColumns as any[]).length) await db.query('ALTER TABLE shift_schedule_revisions ADD COLUMN grace_minutes TINYINT UNSIGNED NOT NULL DEFAULT 15');
  const [columns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shift_sessions'
      AND COLUMN_NAME IN ('end_source', 'scheduled_cutoff_at')`);
  const existing = new Set((columns as any[]).map(row => row.COLUMN_NAME));
  if (!existing.has('end_source')) {
    await db.query("ALTER TABLE shift_sessions ADD COLUMN end_source VARCHAR(16) NOT NULL DEFAULT 'manual'");
  }
  if (!existing.has('scheduled_cutoff_at')) {
    await db.query('ALTER TABLE shift_sessions ADD COLUMN scheduled_cutoff_at DATETIME NULL');
  }
  const [attendanceColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_logs'
      AND COLUMN_NAME IN ('absence_source', 'auto_absent_at', 'late_checkin_approved_by', 'late_checkin_approved_at')`);
  const existingAttendanceColumns = new Set((attendanceColumns as any[]).map(row => row.COLUMN_NAME));
  if (!existingAttendanceColumns.has('absence_source')) {
    await db.query('ALTER TABLE attendance_logs ADD COLUMN absence_source VARCHAR(32) NULL');
  }
  if (!existingAttendanceColumns.has('auto_absent_at')) {
    await db.query('ALTER TABLE attendance_logs ADD COLUMN auto_absent_at DATETIME NULL');
  }
  if (!existingAttendanceColumns.has('late_checkin_approved_by')) {
    await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_by VARCHAR(255) NULL');
  }
  if (!existingAttendanceColumns.has('late_checkin_approved_at')) {
    await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_at DATETIME NULL');
  }
}

export async function getAutomaticShiftCloseSetting(db: Db = pool): Promise<AutomaticShiftCloseSetting> {
  const [rows] = await db.query(`SELECT setting_value, changed_at, changed_by FROM system_settings
    WHERE setting_key='automatic_shift_close_enabled' LIMIT 1`);
  const row = (rows as any[])[0];
  return {
    enabled: row ? row.setting_value !== '0' : true,
    changed_at: row?.changed_at || null,
    changed_by: row?.changed_by || null,
  };
}

export async function setAutomaticShiftCloseSetting(db: Db, enabled: boolean, actorId: string): Promise<AutomaticShiftCloseSetting> {
  await db.query(`INSERT INTO system_settings (setting_key,setting_value,changed_by)
    VALUES ('automatic_shift_close_enabled',?,?)
    ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),changed_by=VALUES(changed_by),changed_at=CURRENT_TIMESTAMP`,
  [enabled ? '1' : '0', actorId]);
  return getAutomaticShiftCloseSetting(db);
}

export async function getScheduleForDate(db: Db, date: string): Promise<ScheduleRevision | null> {
  const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
    start_time, end_time, grace_minutes, actor_id, created_at FROM shift_schedule_revisions
    WHERE effective_date <= ? ORDER BY effective_date DESC LIMIT 1`, [date]);
  return (rows as ScheduleRevision[])[0] || null;
}

export async function getPendingSchedule(db: Db, date: string): Promise<ScheduleRevision | null> {
  const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
    start_time, end_time, grace_minutes, actor_id, created_at FROM shift_schedule_revisions
    WHERE effective_date > ? ORDER BY effective_date ASC LIMIT 1`, [date]);
  return (rows as ScheduleRevision[])[0] || null;
}

export async function getShiftPolicy(db: Db, _riderId: string, now: Date = new Date()): Promise<ShiftPolicy> {
  const { date, time } = getPhilippineDateTime(now);
  const schedule = await getScheduleForDate(db, date);
  if (!schedule) return {
    date, startTime: null, endTime: null, cutoffAt: null,
    canStart: true, canWork: true, nextStartAt: null, active: false, window: 'unconfigured',
  };
  const window = evaluateShiftWindow(time, schedule.start_time, schedule.end_time);
  const graceEnd = minutesFromTime(schedule.start_time) + Number(schedule.grace_minutes ?? 15);
  const canStart = window === 'open' && minutesFromTime(time) < graceEnd;
  const nextDate = window === 'early' || canStart ? date : addPhilippineDays(date, 1);
  const nextSchedule = window === 'early' ? schedule : (await getScheduleForDate(db, nextDate)) || schedule;
  return {
    date, startTime: schedule.start_time, endTime: schedule.end_time,
    cutoffAt: `${date} ${schedule.end_time}:00`,
    canStart, canWork: window === 'open',
    nextStartAt: canStart ? null : `${nextDate} ${nextSchedule.start_time}:00`,
    active: true, window,
  };
}

export async function saveNextDaySchedule(db: Db, actorId: string, startTime: string, endTime: string, graceMinutes = 15, now: Date = new Date()): Promise<ScheduleRevision> {
  if (!validScheduleTimes(startTime, endTime)) throw new Error('Start time must be before end time, both in HH:mm format.');
  if (!validGraceMinutes(graceMinutes)) throw new Error('Grace period must be a whole number from 0 to 120 minutes.');
  const effectiveDate = addPhilippineDays(getPhilippineDateTime(now).date, 1);
  await db.query(`INSERT INTO shift_schedule_revisions (effective_date,start_time,end_time,grace_minutes,actor_id)
    VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time), grace_minutes=VALUES(grace_minutes), actor_id=VALUES(actor_id), created_at=CURRENT_TIMESTAMP`,
  [effectiveDate, startTime, endTime, graceMinutes, actorId]);
  const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
    start_time, end_time, grace_minutes, actor_id, created_at FROM shift_schedule_revisions WHERE effective_date=?`, [effectiveDate]);
  return (rows as ScheduleRevision[])[0];
}
