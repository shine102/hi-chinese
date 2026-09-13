import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { extractBearer } from '../src/auth.js';

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

  it('rejects an unknown token with 401', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('lets a known passphrase through to the route', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer test-passphrase' },
      body: '{}',
    });
    // Auth passed; the route now fails on body parsing instead.
    expect(res.status).toBe(400);
  });

  it('does not guard the health route', async () => {
    const res = await SELF.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
  });
});
