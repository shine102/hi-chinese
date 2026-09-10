import type { SyncRequest, SyncResponse } from '@hi-chinese/content';
import type { HiChineseDb } from '../db/db.js';
import { getCursor, getPassphrase, setMeta } from '../db/meta.js';
import { applyRemoteChanges } from './apply.js';
import { ackOutbox, collectOutbox } from './outbox.js';

export type SyncOutcome = 'synced' | 'pending' | 'offline' | 'unauthorized' | 'error';

export interface SyncResult {
  status: SyncOutcome;
  pushed: number;
  pulled: number;
}

export interface SyncDeps {
  db: HiChineseDb;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
  endpoint?: string;
}

/** Upper bound on requests per sync so a runaway outbox cannot loop forever. */
const MAX_REQUESTS = 20;

function countRows(changes: SyncRequest['changes']): number {
  return changes.unitProgress.length + changes.cards.length + changes.activity.length;
}

/**
 * One full sync: push the outbox (in batches of at most 500 rows per table) and
 * pull rows newer than our cursor, merging with last-write-wins. Never throws.
 */
export async function syncOnce(deps: SyncDeps): Promise<SyncResult> {
  const { db } = deps;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  // Node 22 exposes a global `navigator` without `onLine`, unlike browsers; only
  // an explicit `false` should count as offline.
  const isOnline =
    deps.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const endpoint = deps.endpoint ?? '/api/sync';

  const passphrase = await getPassphrase(db);
  if (!passphrase) return { status: 'unauthorized', pushed: 0, pulled: 0 };
  if (!isOnline()) return { status: 'offline', pushed: 0, pulled: 0 };

  let pushed = 0;
  let pulled = 0;
  for (let i = 0; i < MAX_REQUESTS; i++) {
    const batch = await collectOutbox(db);
    const request: SyncRequest = { cursor: await getCursor(db), changes: batch.changes };

    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${passphrase}` },
        body: JSON.stringify(request),
      });
    } catch {
      return { status: 'error', pushed, pulled };
    }
    if (res.status === 401) return { status: 'unauthorized', pushed, pulled };
    if (!res.ok) return { status: 'error', pushed, pulled };

    let body: SyncResponse;
    try {
      body = (await res.json()) as SyncResponse;
    } catch {
      return { status: 'error', pushed, pulled };
    }

    pulled += await applyRemoteChanges(db, body.changes);
    await ackOutbox(db, batch.entries);
    await setMeta(db, 'cursor', body.cursor);
    pushed += countRows(batch.changes);

    if (batch.remaining === 0) break;
  }

  const left = await db.outbox.count();
  return { status: left === 0 ? 'synced' : 'pending', pushed, pulled };
}
