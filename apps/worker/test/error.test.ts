import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { emptyChanges } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';

// Own file so the per-test-*file* storage isolation contains the dropped
// table to this file and does not affect any other test file's D1 instance.
describe('unhandled errors', () => {
  it('never leaks details: 500 with a generic body', async () => {
    await env.DB.exec('DROP TABLE unit_progress');

    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer test-passphrase', 'content-type': 'application/json' },
      body: JSON.stringify({ cursor: 0, changes: emptyChanges() }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'internal error' });
  });
});
