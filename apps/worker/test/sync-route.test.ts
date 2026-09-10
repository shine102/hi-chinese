import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { emptyChanges, type SyncResponse } from '@hi-chinese/content';
import { beforeEach, describe, expect, it } from 'vitest';

// The Cloudflare vitest plugin isolates storage per test *file*, not per
// individual test case (this file's tests otherwise share one D1 instance),
// so reset the tables and sequence counter before every test.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM unit_progress'),
    env.DB.prepare('DELETE FROM cards'),
    env.DB.prepare('DELETE FROM activity'),
    env.DB.prepare('UPDATE sync_meta SET seq = 0 WHERE id = 1'),
  ]);
});

const post = (body: string, token = 'test-passphrase') =>
  SELF.fetch('https://hi.test/api/sync', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body,
  });

describe('POST /api/sync', () => {
  it('rejects non-JSON bodies with 400', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid JSON' });
  });

  it('rejects invalid shapes with 400 and a path', async () => {
    const res = await post(JSON.stringify({ cursor: -1, changes: emptyChanges() }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/^cursor: /);
  });

  it('round-trips progress for a fresh device', async () => {
    const first = await post(
      JSON.stringify({
        cursor: 0,
        changes: {
          ...emptyChanges(),
          unitProgress: [
            { unitId: 'l1-u01', status: 'completed', completedAt: 1000, updatedAt: 1000 },
          ],
        },
      }),
    );
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('no-store');
    const body = (await first.json()) as SyncResponse;
    expect(body.cursor).toBe(1);
    expect(body.changes.unitProgress).toEqual([
      { unitId: 'l1-u01', status: 'completed', completedAt: 1000, updatedAt: 1000 },
    ]);

    const fresh = await post(JSON.stringify({ cursor: 0, changes: emptyChanges() }));
    expect(((await fresh.json()) as SyncResponse).changes.unitProgress).toHaveLength(1);
  });

  it('still requires the passphrase', async () => {
    const res = await post(JSON.stringify({ cursor: 0, changes: emptyChanges() }), 'wrong');
    expect(res.status).toBe(401);
  });

  it('rejects GET on the sync route', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      headers: { authorization: 'Bearer test-passphrase' },
    });
    expect(res.status).toBe(404);
  });
});
