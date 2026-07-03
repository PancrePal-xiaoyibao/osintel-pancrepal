// T2 — Auth contract test. Verifies bcrypt hashing round-trips and JWT sign/verify.
// Does not touch the network or a real DB; the password + jwt modules are pure functions.
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, isBcryptHash } from '../src/server/auth/password.ts';
import { signAccessToken, verifyAccessToken } from '../src/server/auth/jwt.ts';

// --- Password hashing ---
{
  const hash = await hashPassword('correct horse battery staple');
  assert.ok(typeof hash === 'string' && hash.length > 0);
  assert.ok(isBcryptHash(hash), 'hash must look like a bcrypt hash');
  assert.ok(await verifyPassword('correct horse battery staple', hash), 'correct password verifies');
  assert.ok(!(await verifyPassword('wrong password', hash)), 'wrong password fails');
  assert.ok(!(await verifyPassword('', hash)), 'empty password fails');
}

// Hashing rejects weak passwords (< 8 chars) at write time.
{
  let threw = false;
  try {
    await hashPassword('short');
  } catch (err) {
    threw = true;
    assert.match(err.message, /too_short/);
  }
  assert.ok(threw, 'short password must throw');
}

// verifyPassword swallows malformed-hash errors rather than throwing.
{
  assert.ok(!(await verifyPassword('anything', 'not-a-hash')), 'malformed hash returns false');
}

// --- JWT sign / verify ---
{
  const token = signAccessToken({ uid: 'local-alice', username: 'alice', role: 'user' });
  assert.ok(typeof token === 'string' && token.split('.').length === 3, 'JWT has 3 dot-separated parts');
  const decoded = verifyAccessToken(token);
  assert.equal(decoded.uid, 'local-alice');
  assert.equal(decoded.username, 'alice');
  assert.equal(decoded.role, 'user');
}

// Tampered token must be rejected.
{
  const token = signAccessToken({ uid: 'local-bob', username: 'bob', role: 'admin' });
  const tampered = token.slice(0, -4) + 'AAAA';
  let threw = false;
  try {
    verifyAccessToken(tampered);
  } catch {
    threw = true;
  }
  assert.ok(threw, 'tampered token must throw');
}

console.log('auth.test.mjs: PASS');
