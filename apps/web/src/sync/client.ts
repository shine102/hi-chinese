import type { SyncRequest, SyncResponse } from '@hi-chinese/content';
import type { HiChineseDb } from '../db/db.js';
import { getCursor, getPassphrase, setMeta } from '../db/meta.js';
import { applyRemoteChanges } from './apply.js';
import { ackOutbox, collectOutbox } from './outbox.js';

/**
 * - `'synced'` — outbox fully pushed and any newer remote rows pulled in.
 * - `'pending'` — some outbox rows remain (batched, or a row changed mid-flight);
 *   a later sync retries automatically, no user-facing error.
 * - `'offline'` — the browser is offline; outbox kept for the next attempt.
 * - `'unauthorized'` — no passphrase stored, or the server rejected it (401);
 *   re-prompt for the passphrase.
 * - `'error'` — INTERNAL only (5xx, a network failure, or a malformed response
 *   body). UI code must render this exactly like `'pending'` — never a distinct
 *   user-facing error — the outbox is kept and sync retries automatically. It
 *   exists as a separate value only so the setup screen can tell "request
 *   failed" apart from "pushed with leftovers" for its own diagnostics.
 */
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

/** Narrows an untrusted parsed response body to `SyncResponse`. */
function isSyncResponse(body: unknown): body is SyncResponse {
  if (typeof body !== 'object' || body === null) return false;
  const cursor = (body as Record<string, unknown>).cursor;
  const changes = (body as Record<string, unknown>).changes;
  if (typeof cursor !== 'number') return false;
  if (typeof changes !== 'object' || changes === null) return false;
  const c = changes as Record<string, unknown>;
  return Array.isArray(c.unitProgress) && Array.isArray(c.cards) && Array.isArray(c.activity);
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

  let pushed = 0;
  let pulled = 0;
  try {
    const passphrase = await getPassphrase(db);
    if (!passphrase) return { status: 'unauthorized', pushed, pulled };
    if (!isOnline()) return { status: 'offline', pushed, pulled };

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

      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        return { status: 'error', pushed, pulled };
      }
      if (!isSyncResponse(parsed)) return { status: 'error', pushed, pulled };
      const body = parsed;

      pulled += await applyRemoteChanges(db, body.changes);
      await ackOutbox(db, batch.entries);
      await setMeta(db, 'cursor', body.cursor);
      pushed += countRows(batch.changes);

      if (batch.remaining === 0) break;
    }

    const left = await db.outbox.count();
    return { status: left === 0 ? 'synced' : 'pending', pushed, pulled };
  } catch (err) {
    // Never let a rejection (e.g. a Dexie error) escape syncOnce; never log the
    // request itself, which carries the passphrase in its Authorization header.
    console.error('sync failed', err);
    return { status: 'error', pushed, pulled };
  }
}
