// TODO: switch SELF (deprecated) to exports.default once wrangler types codegen is added.
import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await SELF.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  // In production non-API paths never reach the Worker (the assets layer serves
  // them); this pins the Worker's own behaviour, which the Vitest plugin exercises directly.
  it('answers unknown paths with a JSON 404', async () => {
    const res = await SELF.fetch('https://hi.test/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});

describe('test harness', () => {
  it('has a migrated D1 and a seeded test user', async () => {
    const row = await env.DB.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{
      seq: number;
    }>();
    expect(row).toEqual({ seq: 0 });
    const user = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?1')
      .bind('test-user')
      .first<{ user_id: string }>();
    expect(user).toEqual({ user_id: 'test-user' });
  });
});
