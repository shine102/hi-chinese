import { cardId, emptyChanges, type SyncRequest, type SyncResponse } from '@hi-chinese/content';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb, outboxKey, type HiChineseDb } from '../../src/db/db.js';
import { getCursor, setMeta } from '../../src/db/meta.js';
import { completeUnit, markUnitStarted } from '../../src/db/progress.js';
import { syncOnce } from '../../src/sync/client.js';
import { requestSync, getSyncState, resetSyncStateForTests } from '../../src/sync/store.js';

let db: HiChineseDb;
beforeEach(async () => {
  db = openDb(`test-${crypto.randomUUID()}`);
  await setMeta(db, 'passphrase', 'test-passphrase');
  resetSyncStateForTests();
});
afterEach(async () => {
  await db.delete();
});

type Handler = (req: SyncRequest, init: RequestInit) => Response | Promise<Response>;
function fakeFetch(handler: Handler) {
  const calls: SyncRequest[] = [];
  const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as SyncRequest;
    calls.push(body);
    return handler(body, init ?? {});
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const echo =
  (cursor: number): Handler =>
  (req) =>
    json({ cursor, changes: req.changes } satisfies SyncResponse);

describe('syncOnce', () => {
  it('reports unauthorized without a network call when no passphrase is stored', async () => {
    await db.meta.delete('passphrase');
    const { fetchImpl, calls } = fakeFetch(echo(1));
    expect(await syncOnce({ db, fetchImpl })).toEqual({
      status: 'unauthorized',
      pushed: 0,
      pulled: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it('reports offline and keeps the outbox when the browser is offline', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl, calls } = fakeFetch(echo(1));
    expect(await syncOnce({ db, fetchImpl, isOnline: () => false })).toMatchObject({
      status: 'offline',
    });
    expect(calls).toHaveLength(0);
    expect(await db.outbox.count()).toBe(1);
  });

  it('pushes the outbox with the bearer passphrase and cursor, then clears it and stores the new cursor', async () => {
    await completeUnit(db, { unitId: 'l1-u01', wordIds: ['w:我'], characters: ['我'], now: 1000 });
    let auth: string | null = null;
    const { fetchImpl, calls } = fakeFetch((req, init) => {
      auth = new Headers(init.headers).get('authorization');
      return echo(7)(req, init);
    });
    const result = await syncOnce({ db, fetchImpl });
    expect(result).toEqual({ status: 'synced', pushed: 5, pulled: 0 });
    expect(auth).toBe('Bearer test-passphrase');
    expect(calls[0]?.cursor).toBe(0);
    expect(calls[0]?.changes.unitProgress).toHaveLength(1);
    expect(calls[0]?.changes.cards).toHaveLength(3);
    expect(calls[0]?.changes.activity).toHaveLength(1);
    expect(await db.outbox.count()).toBe(0);
    expect(await getCursor(db)).toBe(7);
  });

  it('applies newer remote rows, ignores older ones, and drops outbox entries the remote row superseded', async () => {
    await markUnitStarted(db, 'l1-u01', 1000); // local pending, updatedAt 1000
    await markUnitStarted(db, 'l1-u02', 5000); // local pending, newer than remote
    const remote = {
      cursor: 3,
      changes: {
        unitProgress: [
          { unitId: 'l1-u01', status: 'completed', completedAt: 2000, updatedAt: 2000 },
          { unitId: 'l1-u02', status: 'completed', completedAt: 100, updatedAt: 100 },
          { unitId: 'l1-u03', status: 'in-progress', completedAt: null, updatedAt: 50 },
        ],
        cards: [],
        activity: [],
      },
    } satisfies SyncResponse;
    const { fetchImpl } = fakeFetch(() => json(remote));
    const result = await syncOnce({ db, fetchImpl });
    expect(result).toEqual({ status: 'synced', pushed: 2, pulled: 2 });
    expect((await db.unitProgress.get('l1-u01'))?.status).toBe('completed');
    expect((await db.unitProgress.get('l1-u02'))?.status).toBe('in-progress');
    expect((await db.unitProgress.get('l1-u03'))?.updatedAt).toBe(50);
    expect(await db.outbox.count()).toBe(0);
  });

  it('keeps an outbox entry that was modified while the request was in flight', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl } = fakeFetch(async (req, init) => {
      // A newer local write lands before the response arrives.
      await db.unitProgress.put({
        unitId: 'l1-u01',
        status: 'completed',
        completedAt: 1500,
        updatedAt: 1500,
      });
      await db.outbox.put({
        key: outboxKey('unitProgress', 'l1-u01'),
        table: 'unitProgress',
        rowKey: 'l1-u01',
        updatedAt: 1500,
      });
      return echo(2)(req, init);
    });
    const result = await syncOnce({ db, fetchImpl });
    expect(result.status).toBe('pending');
    expect(await db.outbox.toArray()).toMatchObject([{ updatedAt: 1500 }]);
  });

  it('reports unauthorized on 401 and keeps the outbox', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl } = fakeFetch(() => json({ error: 'unauthorized' }, 401));
    expect(await syncOnce({ db, fetchImpl })).toMatchObject({ status: 'unauthorized' });
    expect(await db.outbox.count()).toBe(1);
    expect(await getCursor(db)).toBe(0);
  });

  it('reports error on 5xx and network failure and keeps the outbox', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl: five } = fakeFetch(() => json({ error: 'internal error' }, 500));
    expect(await syncOnce({ db, fetchImpl: five })).toMatchObject({ status: 'error' });
    const boom = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await syncOnce({ db, fetchImpl: boom })).toMatchObject({ status: 'error' });
    expect(await db.outbox.count()).toBe(1);
  });

  it('splits more than 500 rows per table across requests', async () => {
    const wordIds = Array.from({ length: 300 }, (_, i) => `w:x${i}`); // 600 cards
    await completeUnit(db, { unitId: 'l1-u01', wordIds, characters: [], now: 1000 });
    let n = 0;
    const { fetchImpl, calls } = fakeFetch((req, init) => echo(++n)(req, init));
    const result = await syncOnce({ db, fetchImpl });
    expect(result.status).toBe('synced');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.changes.cards).toHaveLength(500);
    expect(calls[1]?.changes.cards).toHaveLength(100);
    expect(calls[1]?.cursor).toBe(1);
    expect(await getCursor(db)).toBe(2);
    expect(await db.cards.get(cardId('word-recall', 'w:x299'))).toBeDefined();
  });
});

describe('requestSync store', () => {
  it('tracks status and de-duplicates concurrent calls', async () => {
    const { fetchImpl, calls } = fakeFetch(echo(1));
    const a = requestSync({ db, fetchImpl });
    expect(getSyncState().status).toBe('syncing');
    const b = requestSync({ db, fetchImpl });
    expect(await a).toEqual(await b);
    expect(calls).toHaveLength(1);
    expect(getSyncState()).toMatchObject({ status: 'synced', lastResult: { status: 'synced' } });
    expect(getSyncState().lastSyncedAt).not.toBeNull();
  });
});
