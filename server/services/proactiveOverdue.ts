import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { pool } from '../db';
import { sendPushNotification } from '../routes/notifications';

function formatOverdueDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}
import { getOverdueWarningThresholdMinutes, getProactiveOverdueMetadata, getScheduledEndAt } from '../utils/overdue';

const TERMINAL = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];

const toMysqlDateTime = (iso: string) => iso.slice(0, 19).replace('T', ' ');

export const processProactiveOverdueAlerts = async (io: Server) => {
  const now = new Date();
  const [rows] = await pool.query(`
    SELECT request_id, status, delivery_status, delivery_date, time_window,
           scheduled_end_at, assigned_rider_id, requester_id, pickup_address,
           dropoff_address, recipient_contact, dropoff_lat, dropoff_lng
    FROM delivery_requests
    WHERE status = 'approved'
      AND delivery_date IS NOT NULL
      AND COALESCE(delivery_status, '') NOT IN (?, ?, ?, ?, ?)
    ORDER BY delivery_date, time_window
    LIMIT 1000
  `, TERMINAL);

  const adminsResult = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
  const adminIds = (adminsResult[0] as Array<{ id: string }>).map((admin) => admin.id);

  for (const row of rows as any[]) {
    const scheduledEndAt = getScheduledEndAt(row.delivery_date, row.time_window);
    if (!scheduledEndAt) continue;
    const computedSqlDate = toMysqlDateTime(scheduledEndAt);
    const existingSqlDate = typeof row.scheduled_end_at === 'string'
      ? row.scheduled_end_at.slice(0, 19)
      : row.scheduled_end_at instanceof Date
        ? row.scheduled_end_at.toISOString().slice(0, 19).replace('T', ' ')
        : null;

    if (existingSqlDate !== computedSqlDate) {
      await pool.query(`
        UPDATE delivery_requests
        SET scheduled_end_at = ?, at_risk_notified_at = NULL, overdue_notified_at = NULL
        WHERE request_id = ? AND delivery_date = ? AND time_window = ?
          AND (scheduled_end_at IS NULL OR scheduled_end_at <> ?)
      `, [computedSqlDate, row.request_id, row.delivery_date, row.time_window, computedSqlDate]);
    }

    const metadata = getProactiveOverdueMetadata({ ...row, scheduled_end_at: scheduledEndAt }, now);
    if (metadata.state === 'Normal') continue;
    const event = metadata.state === 'Overdue' ? 'overdue' : 'at_risk';
    const markerColumn = event === 'overdue' ? 'overdue_notified_at' : 'at_risk_notified_at';
    const connection = await pool.getConnection();
    let notifications: Array<{ id: string; user_id: string; message: string; type: string; request_id: string }> = [];
    let assignedRiderId: string | null = null;
    let deliveryDetails: any = {};
    try {
      await connection.beginTransaction();
      const [lockedRows] = await connection.query(`
        SELECT request_id, delivery_status, status, delivery_date, time_window, assigned_rider_id,
               scheduled_end_at, at_risk_notified_at, overdue_notified_at, pickup_address,
               dropoff_address, recipient_contact, dropoff_lat, dropoff_lng
        FROM delivery_requests WHERE request_id = ? FOR UPDATE
      `, [row.request_id]);
      const current = (lockedRows as any[])[0];
      if (!current || TERMINAL.includes(String(current.delivery_status || '').toLowerCase()) || TERMINAL.includes(String(current.status || '').toLowerCase())) {
        await connection.rollback();
        continue;
      }

      const wasAlreadyNotified = Boolean(current[markerColumn]);
      let isOverdueFollowUp = false;
      if (wasAlreadyNotified) {
        if (event !== 'overdue' || !current.overdue_notified_at || now.getTime() - new Date(current.overdue_notified_at).getTime() < 2 * 60 * 60 * 1000) {
          await connection.rollback();
          continue;
        }
        const [existingReminders] = await connection.query(
          'SELECT id FROM notifications WHERE request_id = ? AND type = ? LIMIT 1',
          [row.request_id, 'delivery_overdue_reminder'],
        );
        if ((existingReminders as any[]).length > 0) {
          await connection.rollback();
          continue;
        }
        isOverdueFollowUp = true;
      }

      const lockedDeadline = getScheduledEndAt(current.delivery_date, current.time_window);
      if (!lockedDeadline) {
        await connection.rollback();
        continue;
      }
      const currentMetadata = getProactiveOverdueMetadata({ ...current, scheduled_end_at: lockedDeadline }, now);
      if (currentMetadata.state !== metadata.state) {
        await connection.rollback();
        continue;
      }

      const currentRecipients = [...new Set([current.assigned_rider_id, ...adminIds].filter(Boolean))] as string[];
      if (currentRecipients.length === 0) {
        await connection.rollback();
        continue;
      }
      assignedRiderId = current.assigned_rider_id;
      deliveryDetails = current;

      const lockedSqlDeadline = toMysqlDateTime(lockedDeadline);
      if (event === 'overdue' && !isOverdueFollowUp) {
        await connection.query(
          `UPDATE delivery_requests SET scheduled_end_at = ?, ${markerColumn} = ?, overdue_at = COALESCE(overdue_at, ?) WHERE request_id = ?`,
          [lockedSqlDeadline, now, lockedSqlDeadline, row.request_id],
        );
      } else {
        await connection.query(
          `UPDATE delivery_requests SET scheduled_end_at = ?, ${markerColumn} = ? WHERE request_id = ?`,
          [lockedSqlDeadline, now, row.request_id],
        );
      }
      const minutes = event === 'overdue' ? metadata.overdue_minutes : metadata.remaining_minutes;
      const message = event === 'overdue'
        ? `Delivery #${String(row.request_id).slice(-6).toUpperCase()} is overdue by ${formatOverdueDuration(minutes)}.`
        : `Delivery #${String(row.request_id).slice(-6).toUpperCase()} is at risk and due in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
      const type = event === 'overdue'
        ? (isOverdueFollowUp ? 'delivery_overdue_reminder' : 'delivery_overdue')
        : 'delivery_at_risk';
      for (const userId of currentRecipients) {
        const id = `notif_${randomUUID()}`;
        await connection.query(
          'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
          [id, userId, message, type, row.request_id],
        );
        notifications.push({ id, user_id: userId, message, type, request_id: row.request_id });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`[OVERDUE ALERT] Could not process ${row.request_id}:`, error);
      notifications = [];
    } finally {
      connection.release();
    }

    for (const notification of notifications) {
      io.to(notification.user_id).emit('notification-added', notification);
    }
    const riderNotification = notifications.find((notification) => notification.user_id === assignedRiderId);
    if (riderNotification && assignedRiderId) {
      const isOverdue = event === 'overdue';
      void sendPushNotification(
        assignedRiderId,
        isOverdue ? (riderNotification.type === 'delivery_overdue_reminder' ? 'Delivery overdue reminder' : 'Delivery Overdue') : 'Delivery at risk',
        deliveryDetails.pickup_address && deliveryDetails.dropoff_address
          ? `${riderNotification.message} ${deliveryDetails.pickup_address} → ${deliveryDetails.dropoff_address}`
          : riderNotification.message,
        {
          notificationId: riderNotification.id,
          request_id: row.request_id,
          type: riderNotification.type,
          ...(deliveryDetails.recipient_contact ? { recipient_contact: deliveryDetails.recipient_contact } : {}),
          ...(deliveryDetails.dropoff_lat != null ? { dropoff_lat: deliveryDetails.dropoff_lat } : {}),
          ...(deliveryDetails.dropoff_lng != null ? { dropoff_lng: deliveryDetails.dropoff_lng } : {}),
        },
        {
          channelId: isOverdue ? 'delivery_urgent' : 'delivery_updates',
          categoryId: deliveryDetails.recipient_contact && deliveryDetails.dropoff_lat != null && deliveryDetails.dropoff_lng != null
            ? 'DELIVERY_TASK_CALL_MAP'
            : deliveryDetails.recipient_contact ? 'DELIVERY_TASK_CALL'
              : deliveryDetails.dropoff_lat != null && deliveryDetails.dropoff_lng != null ? 'DELIVERY_TASK_MAP' : 'DELIVERY_TASK',
          tag: `delivery:${row.request_id}:${riderNotification.type}`,
        },
      );
    }
    if (notifications.length > 0) {
      io.to('admin-room').emit('request-updated', { request_id: row.request_id, overdue_state: metadata.state });
      if (assignedRiderId) io.to(assignedRiderId).emit('request-updated', { request_id: row.request_id, overdue_state: metadata.state });
    }
  }
};

export const startProactiveOverdueWorker = (io: Server) => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processProactiveOverdueAlerts(io);
    } catch (error) {
      console.error('[OVERDUE ALERT] Worker pass failed:', error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), 30_000);
  timer.unref?.();
  return timer;
};
