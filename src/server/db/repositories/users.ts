// Users repository — bcrypt-hashed credentials in SQLite (T2).
//
// Replaces the old in-memory `localUsers: Map<string, { password: string }>` which stored
// plaintext passwords. Default account is created on first boot only when ALLOW_DEFAULT_ACCOUNT=1.
import type { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '../../auth/password.ts';
import { getDb } from '../index.ts';
import { logger } from '../../logger.ts';

export interface UserRow {
  username: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  last_login: string | null;
}

export function findUser(username: string): UserRow | null {
  const db: DatabaseSync = getDb();
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as unknown as UserRow | undefined;
  return row ?? null;
}

export async function createUser(username: string, password: string, role: 'user' | 'admin' = 'user'): Promise<UserRow> {
  const db: DatabaseSync = getDb();
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)`
  ).run(username, hash, role, now);
  return { username, password_hash: hash, role, created_at: now, last_login: null };
}

export function touchLastLogin(username: string): void {
  const db: DatabaseSync = getDb();
  db.prepare('UPDATE users SET last_login = ? WHERE username = ?').run(new Date().toISOString(), username);
}

export function countUsers(): number {
  const db: DatabaseSync = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

/**
 * Ensure the default admin/dev account exists. Disabled in production unless
 * ALLOW_DEFAULT_ACCOUNT=1 is explicitly set. Logs creation so ops can audit it.
 */
export async function ensureDefaultAccount(): Promise<void> {
  const allowDefault = process.env.ALLOW_DEFAULT_ACCOUNT === '1' || process.env.NODE_ENV !== 'production';
  if (!allowDefault) return;

  const username = process.env.DEFAULT_USERNAME || 'admin';
  const password = process.env.DEFAULT_PASSWORD || 'pancreas123';

  if (findUser(username)) return;

  if (process.env.NODE_ENV === 'production' && password === 'pancreas123') {
    logger.warn({ username }, 'default_account_created_with_weak_password_in_prod');
  }

  await createUser(username, password, 'admin');
  logger.warn({ username }, 'default_account_created');
}
