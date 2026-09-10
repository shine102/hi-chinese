import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { constantTimeEqual, extractBearer } from '../src/auth.js';
import app from '../src/index.js';
import { env } from 'cloudflare:workers';

describe('constantTimeEqual', () => {
  it('is true only for identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('密码', '密码')).toBe(true);
    expect(constantTimeEqual('密码', '密碼')).toBe(false);
  });
});

describe('extractBearer', () => {
  it('extracts the token case-insensitively and trims whitespace', () => {
    expect(extractBearer('Bearer abc')).toBe('abc');
    expect(extractBearer('bearer   abc  ')).toBe('abc');
    expect(extractBearer('Basic abc')).toBeNull();
    expect(extractBearer('Bearer')).toBeNull();
    expect(extractBearer('Bearer ')).toBeNull();
    expect(extractBearer(undefined)).toBeNull();
  });
});

describe('requirePassphrase on /api/sync', () => {
  it('rejects a missing token with 401', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
  it('rejects a wrong token with 401', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });
  it('lets the right token through to the route', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer test-passphrase' },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });
  it('returns 500 when the passphrase secret is not configured', async () => {
    const res = await app.fetch(
      new Request('https://hi.test/api/sync', { method: 'POST', body: '{}' }),
      { ...env, SYNC_PASSPHRASE: '' },
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server not configured' });
  });
  it('does not guard the health route', async () => {
    const res = await SELF.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
  });
});
