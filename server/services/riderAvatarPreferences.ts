import { pool } from '../db';

let ensureTablePromise: Promise<void> | null = null;

export async function ensureRiderAvatarPreferencesTable(): Promise<void> {
  ensureTablePromise ??= pool.query(`
    CREATE TABLE IF NOT EXISTS rider_avatar_preferences (
      user_id VARCHAR(191) NOT NULL PRIMARY KEY,
      avatar_id VARCHAR(32) NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).then(() => undefined).catch((error) => {
    ensureTablePromise = null;
    throw error;
  });
  await ensureTablePromise;
}

export async function saveRiderAvatarPreference(userId: string, avatarId: string): Promise<void> {
  await ensureRiderAvatarPreferencesTable();
  await pool.query(
    'INSERT INTO rider_avatar_preferences (user_id, avatar_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE avatar_id = VALUES(avatar_id)',
    [userId, avatarId],
  );
}

export async function getRiderAvatarPreference(userId: string): Promise<string | null> {
  const [rows] = await pool.query(
    'SELECT avatar_id FROM rider_avatar_preferences WHERE user_id = ?',
    [userId],
  );
  return (rows as Array<{ avatar_id?: string | null }>)[0]?.avatar_id ?? null;
}
