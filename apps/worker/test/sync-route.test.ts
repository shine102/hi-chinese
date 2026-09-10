import { SELF } from 'cloudflare:test';
import { emptyChanges, type SyncResponse } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';

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
