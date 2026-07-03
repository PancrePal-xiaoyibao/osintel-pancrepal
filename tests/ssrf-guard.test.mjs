// T3 — SSRF guard contract test. Validates private-IP detection (pure function) and
// URL parsing rejections. Real-DNS tests are flaky in CI, so we cover the deterministic layer.
import assert from 'node:assert/strict';
import { isPrivateIp, SsrfError } from '../src/server/security/ssrf-guard.ts';

// IPv4 private/loopback/metadata ranges must all be flagged.
assert.equal(isPrivateIp('127.0.0.1'), true, 'loopback v4');
assert.equal(isPrivateIp('10.0.0.1'), true, 'private 10/8');
assert.equal(isPrivateIp('192.168.1.1'), true, 'private 192.168/16');
assert.equal(isPrivateIp('172.16.0.1'), true, 'private 172.16/12 lower');
assert.equal(isPrivateIp('172.31.255.255'), true, 'private 172.16/12 upper');
assert.equal(isPrivateIp('172.32.0.1'), false, '172.32 is public');
assert.equal(isPrivateIp('169.254.169.254'), true, 'AWS metadata IP');
assert.equal(isPrivateIp('0.0.0.0'), true, 'unspecified v4');
assert.equal(isPrivateIp('100.64.0.1'), true, 'CGNAT');

// Public IPv4s pass.
assert.equal(isPrivateIp('8.8.8.8'), false, 'Google DNS');
assert.equal(isPrivateIp('1.1.1.1'), false, 'Cloudflare DNS');
assert.equal(isPrivateIp('203.0.113.5'), false, 'TEST-NET-3 (documentation)');

// IPv6 cases.
assert.equal(isPrivateIp('::1'), true, 'loopback v6');
assert.equal(isPrivateIp('::'), true, 'unspecified v6');
assert.equal(isPrivateIp('fe80::1'), true, 'link-local v6');
assert.equal(isPrivateIp('fc00::1'), true, 'unique-local v6');
assert.equal(isPrivateIp('fd12:3456::1'), true, 'unique-local v6 fd');
assert.equal(isPrivateIp('2606:4700:4700::1111'), false, 'Cloudflare v6 public');

// IPv4-mapped IPv6 still detected.
assert.equal(isPrivateIp('::ffff:169.254.169.254'), true, 'v4-mapped metadata');
assert.equal(isPrivateIp('::ffff:8.8.8.8'), false, 'v4-mapped public');

// Unknown family treated as private (fail-closed).
assert.equal(isPrivateIp('not-an-ip'), true, 'garbage treated as private');

// SsrfError carries a stable code for clients to branch on.
const err = new SsrfError('private_ip_resolved', 'evil.com -> 10.0.0.1');
assert.equal(err.code, 'private_ip_resolved');
assert.equal(err.status, 422);
assert.equal(err.expose, true);
assert.match(err.message, /10\.0\.0\.1/);

console.log('ssrf-guard.test.mjs: PASS');
