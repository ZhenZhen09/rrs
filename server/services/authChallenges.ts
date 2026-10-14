import { createHash, randomBytes } from 'crypto';
import { pool } from '../db';

export type AuthChallengePurpose = 'mfa_setup' | 'mfa_setup_verify' | 'mfa_login' | 'password_reset';

export interface AuthChallenge {
  userId: string;
  payload: Record<string, unknown>;
}

let tableReady: Promise<void> | null = null;

export async function ensureAuthChallengesTable() {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS auth_challenges (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        purpose VARCHAR(32) NOT NULL,
        payload JSON NULL,
        expires_at DATETIME(3) NOT NULL,
        consumed_at DATETIME(3) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_auth_challenges_expiry (expires_at),
        INDEX idx_auth_challenges_user_purpose (user_id, purpose)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).then(() => undefined).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueAuthChallenge(
  userId: string,
  purpose: AuthChallengePurpose,
  payload: Record<string, unknown> = {},
  ttlMs = 5 * 60 * 1000,
) {
  await ensureAuthChallengesTable();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMs).toISOString().slice(0, 23).replace('T', ' ');
  await pool.query(
    'INSERT INTO auth_challenges (token_hash, user_id, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?)',
    [hashToken(token), userId, purpose, JSON.stringify(payload), expiresAt],
  );
  return token;
}

export async function findAuthChallenge(token: unknown, purpose: AuthChallengePurpose): Promise<AuthChallenge | null> {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await ensureAuthChallengesTable();
  const [rows] = await pool.query(
    `SELECT user_id, payload FROM auth_challenges
     WHERE token_hash = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
     LIMIT 1`,
    [hashToken(token), purpose],
  ) as any[];
  const challenge = rows?.[0];
  if (!challenge) return null;
  let payload = challenge.payload || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  return { userId: String(challenge.user_id), payload: payload as Record<string, unknown> };
}

export async function consumeAuthChallenge(token: unknown, purpose: AuthChallengePurpose) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  await ensureAuthChallengesTable();
  const [result] = await pool.query(
    `UPDATE auth_challenges SET consumed_at = UTC_TIMESTAMP(3)
     WHERE token_hash = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)`,
    [hashToken(token), purpose],
  ) as any[];
  return result?.affectedRows === 1;
}
