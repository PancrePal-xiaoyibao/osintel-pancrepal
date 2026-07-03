// Password hashing — bcryptjs (pure JS, no native compile) with cost 10.
// Salt rounds can be tuned via env; 10 ≈ ~80ms on modern CPU, acceptable for our user volume.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_COST || '10', 10);

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('password_too_short');
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// Constant-time-ish check that a stored value looks like a bcrypt hash ($2a/$2b/$2y$ prefix).
export function isBcryptHash(value: string): boolean {
  return /^\$2[abxy]\$\d{2}\$.{53}$/.test(value);
}
