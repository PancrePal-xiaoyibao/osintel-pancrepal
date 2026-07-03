// T1 — Security middleware contract test. Verifies the static bits: middleware exports the
// right shape, rate-limit configs parse, asyncHandler forwards errors, and the error
// envelope matches the spec. We don't spin up a live server here — the unit coverage
// guards against accidental config regressions.
import assert from 'node:assert/strict';

const { asyncHandler, globalErrorHandler } = await import('../src/server/middleware/error.ts');
const { coreSecurityMiddleware, authRateLimit, llmRateLimit, globalRateLimit, ALLOWED_ORIGINS } =
  await import('../src/server/middleware/security.ts');
const { requestIdMiddleware } = await import('../src/server/middleware/request-id.ts');

// Security middleware is mounted as an array (helmet/cors/compression/rateLimit).
assert.ok(Array.isArray(coreSecurityMiddleware), 'core middleware exported as array');
assert.ok(coreSecurityMiddleware.length >= 4, 'helmet + cors + compression + global rate-limit present');

// Rate limiters are functions (Express middleware shape).
assert.equal(typeof authRateLimit, 'function');
assert.equal(typeof llmRateLimit, 'function');
assert.equal(typeof globalRateLimit, 'function');

// CORS whitelist is parsed from env / has sane defaults.
assert.ok(ALLOWED_ORIGINS.length >= 1, 'at least one origin allowed');
assert.ok(ALLOWED_ORIGINS.includes('http://localhost:3000'), 'localhost:3000 allowed by default');

// requestId middleware attaches req.id and sets the X-Request-Id header.
{
  let headerValue;
  const fakeReq = { headers: {} };
  const fakeRes = {
    setHeader(k, v) {
      headerValue = v;
    }
  };
  let nextCalled = false;
  requestIdMiddleware(fakeReq, fakeRes, () => { nextCalled = true; });
  assert.ok(nextCalled, 'next() called');
  assert.ok(fakeReq.id, 'req.id assigned');
  assert.ok(typeof headerValue === 'string' && headerValue.length > 0, 'X-Request-Id set');
}

// requestId honors an incoming X-Request-Id (trace propagation).
{
  const fakeReq = { headers: { 'x-request-id': 'trace-abc-123' } };
  const fakeRes = { setHeader() {} };
  requestIdMiddleware(fakeReq, fakeRes, () => {});
  assert.equal(fakeReq.id, 'trace-abc-123', 'incoming trace id propagated');
}

// asyncHandler forwards rejected promises to next() (the error middleware).
{
  const boom = new Error('boom');
  const handler = asyncHandler(async () => { throw boom; });
  let captured;
  await handler({}, {}, (e) => { captured = e; });
  assert.equal(captured, boom, 'rejected promise forwarded to next()');
}

// globalErrorHandler returns the spec envelope on 5xx.
{
  const chunks = [];
  let statusCode;
  const fakeRes = {
    headersSent: false,
    status(code) { statusCode = code; return this; },
    json(payload) { chunks.push(payload); }
  };
  const fakeReq = { id: 'req-1', path: '/api/x', method: 'POST' };
  const err = new Error('something exploded');
  err.status = 500;
  globalErrorHandler(err, fakeReq, fakeRes, () => {});
  assert.equal(statusCode, 500);
  assert.equal(chunks[0].status, 'error');
  assert.equal(chunks[0].mode, 'unavailable');
  assert.equal(chunks[0].reason, 'internal_error', '5xx hides internal message');
  assert.equal(chunks[0].requestId, 'req-1');
}

// globalErrorHandler exposes the message on 4xx (client errors are caller-controlled).
{
  const chunks = [];
  const fakeRes = {
    headersSent: false,
    status() { return this; },
    json(payload) { chunks.push(payload); }
  };
  const fakeReq = { id: 'req-2', path: '/api/x', method: 'POST' };
  const err = new Error('bad_input:missing_field');
  err.status = 400;
  globalErrorHandler(err, fakeReq, fakeRes, () => {});
  assert.equal(chunks[0].mode, 'graceful_fallback');
  assert.match(chunks[0].reason, /bad_input/, '4xx exposes the message');
}

// globalErrorHandler respects headersSent (no double-write after SSE/stream end).
{
  let jsonCalled = false;
  const fakeRes = {
    headersSent: true,
    status() { return this; },
    json() { jsonCalled = true; }
  };
  globalErrorHandler(new Error('late'), { id: 'r', path: '/x', method: 'GET' }, fakeRes, () => {});
  assert.equal(jsonCalled, false, 'no body written after headersSent');
}

console.log('security-middleware.test.mjs: PASS');
