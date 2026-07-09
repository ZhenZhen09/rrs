import crypto from 'crypto';
import { pool } from '../db';

type ConnectivityEventType =
  | 'duty_on'
  | 'duty_off'
  | 'offline_in_progress'
  | 'online_restored'
  | 'delayed_location';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

interface ConnectivityLogInput {
  riderId: string;
  riderName?: string | null;
  requestId?: string | null;
  eventType: ConnectivityEventType;
  eventTime?: Date;
  deliveryStatus?: string | null;
  isOnDuty?: boolean | null;
  lat?: number | string | null;
  lng?: number | string | null;
  locationRecordedAt?: Date | string | null;
  batteryLevel?: number | string | null;
  networkType?: string | null;
  durationSeconds?: number | null;
  metadata?: Record<string, unknown> | null;
}

export const classifyLikelyReason = (batteryLevel?: number | string | null) => {
  if (batteryLevel === null || batteryLevel === undefined || batteryLevel === '') return 'Unknown';
  const battery = Number(batteryLevel);
  if (!Number.isFinite(battery)) return 'Unknown';
  if (battery <= 20) return 'Low Battery Risk';
  if (battery <= 40) return 'Likely Battery Conservation';
  return 'Suspicious Offline';
};

export const classifyRiskLevel = (
  durationSeconds?: number | null,
  batteryLevel?: number | string | null,
  repeatIncidents = 0,
): RiskLevel => {
  if (repeatIncidents >= 5) return 'critical';
  if (repeatIncidents >= 2) return 'high';
  if (durationSeconds === null || durationSeconds === undefined) return 'unknown';
  if (durationSeconds > 15 * 60) return 'critical';
  if (durationSeconds >= 5 * 60) return 'high';
  if (durationSeconds >= 2 * 60) return 'medium';
  const battery = batteryLevel === null || batteryLevel === undefined ? null : Number(batteryLevel);
  if (battery !== null && Number.isFinite(battery) && battery <= 20) return 'low';
  return 'low';
};

const toSqlDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 19).replace('T', ' ');
  return value.toISOString().slice(0, 19).replace('T', ' ');
};

const getLocationAgeSeconds = (eventTime: Date, locationRecordedAt?: Date | string | null) => {
  if (!locationRecordedAt) return null;
  const locationTime = new Date(locationRecordedAt).getTime();
  if (!Number.isFinite(locationTime)) return null;
  return Math.max(0, Math.round((eventTime.getTime() - locationTime) / 1000));
};

export const recordConnectivityLog = async (input: ConnectivityLogInput) => {
  const eventTime = input.eventTime || new Date();
  const likelyReason = input.eventType === 'offline_in_progress'
    ? classifyLikelyReason(input.batteryLevel)
    : null;
  const riskLevel = input.eventType === 'offline_in_progress' || input.eventType === 'online_restored'
    ? classifyRiskLevel(input.durationSeconds ?? null, input.batteryLevel)
    : 'low';

  try {
    await pool.query(
      `INSERT INTO rider_connectivity_logs (
        id, rider_id, rider_name, request_id, event_type, event_time,
        delivery_status, is_on_duty, lat, lng, location_recorded_at,
        location_age_seconds, battery_level, network_type, duration_seconds,
        likely_reason, risk_level, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `rcl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        input.riderId,
        input.riderName || null,
        input.requestId || null,
        input.eventType,
        toSqlDate(eventTime),
        input.deliveryStatus || null,
        input.isOnDuty === null || input.isOnDuty === undefined ? null : input.isOnDuty,
        input.lat ?? null,
        input.lng ?? null,
        toSqlDate(input.locationRecordedAt),
        getLocationAgeSeconds(eventTime, input.locationRecordedAt),
        input.batteryLevel ?? null,
        input.networkType || null,
        input.durationSeconds ?? null,
        likelyReason,
        riskLevel,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[ConnectivityLog] rider_connectivity_logs missing; run scripts/migrate-rider-connectivity-logs.cjs');
      return;
    }
    console.error('[ConnectivityLog] Failed to record event:', err?.message || err);
  }
};

export const getLatestOfflineIncident = async (riderId: string, requestId?: string | null) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, event_time
       FROM rider_connectivity_logs
       WHERE rider_id = ?
         AND event_type = 'offline_in_progress'
         AND (? IS NULL OR request_id = ?)
       ORDER BY event_time DESC
       LIMIT 1`,
      [riderId, requestId || null, requestId || null],
    );
    return rows?.[0] || null;
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[ConnectivityLog] Failed to read latest offline incident:', err?.message || err);
    }
    return null;
  }
};
