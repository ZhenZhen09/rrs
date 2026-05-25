import { pool } from '../db';

/**
 * Enterprise Audit Logger (Phase 3.2)
 * 
 * Records administrative and system-level actions for permanent traceability.
 */

export interface AuditLogEntry {
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: any;
  new_values: any;
  ip_address?: string;
  user_agent?: string;
}

export const logAction = async (entry: AuditLogEntry) => {
  try {
    await pool.query(
      `INSERT INTO system_audit_logs 
       (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.actor_id,
        entry.actor_role,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        entry.old_values ? JSON.stringify(entry.old_values) : null,
        JSON.stringify(entry.new_values),
        entry.ip_address || null,
        entry.user_agent || null
      ]
    );
    console.log(`[AUDIT] Logged ${entry.action} on ${entry.resource_type}:${entry.resource_id}`);
  } catch (err) {
    console.error('[AUDIT] Failed to write log:', err);
    // Don't throw - we don't want to crash the main app if logging fails
  }
};
