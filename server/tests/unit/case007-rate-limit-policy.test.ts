jest.mock('../../src/config/logger', () => ({
  warn: jest.fn(),
}));

import {
  RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES,
  RATE_LIMIT_IP_MAX_PER_MINUTE,
  authenticatedUserKey,
  loginAttemptAccountKey,
  rateLimitIpKey,
} from '../../src/middlewares/rateLimitPolicy';

function forgedBearerToken(id: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id })).toString('base64url');
  return `Bearer ${header}.${payload}.forged`;
}

function request(overrides: Record<string, unknown> = {}): any {
  return {
    body: {},
    headers: {},
    ip: '203.0.113.10',
    method: 'GET',
    originalUrl: '/api/products',
    ...overrides,
  };
}

describe('CASE-007 rate-limit policy', () => {
  it('keeps the owner-approved D1 and D2 quotas explicit', () => {
    expect(RATE_LIMIT_IP_MAX_PER_MINUTE).toBe(1600);
    expect(RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES).toBe(300);
  });

  it('ignores forged JWT ids when computing the API IP quota key', () => {
    const key = rateLimitIpKey(request({ headers: { authorization: forgedBearerToken(42) } }));

    expect(key).toMatch(/^ip:/);
    expect(key).not.toBe('user:42');
  });

  it('collapses multiple forged JWT identities from the same origin into one IP bucket', () => {
    const firstKey = rateLimitIpKey(request({ headers: { authorization: forgedBearerToken(42) } }));
    const secondKey = rateLimitIpKey(request({ headers: { authorization: forgedBearerToken(99) } }));

    expect(firstKey).toBe(secondKey);
  });

  it('uses the authenticated user id only after authentication has populated req.user', () => {
    const key = authenticatedUserKey(request({ user: { id: 42 } }));

    expect(key).toBe('user:42');
  });

  it('preserves per-account login protection while exposing the shared IP quota key', () => {
    const firstLoginKey = loginAttemptAccountKey(request({ body: { email: 'Alice@Example.com' } }));
    const secondLoginKey = loginAttemptAccountKey(request({ body: { email: 'Bob@Example.com' } }));
    const firstIpKey = rateLimitIpKey(request({ body: { email: 'Alice@Example.com' } }));
    const secondIpKey = rateLimitIpKey(request({ body: { email: 'Bob@Example.com' } }));

    expect(firstLoginKey).not.toBe(secondLoginKey);
    expect(firstIpKey).toBe(secondIpKey);
  });
});
