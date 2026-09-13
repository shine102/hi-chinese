import { emptyChanges, type SyncChanges } from '@hi-chinese/content';
import type { HiChineseDb, OutboxRow, OutboxTable } from '../db/db.js';

/** Mirrors the Worker's per-table request cap. */
export const MAX_ROWS_PER_TABLE = 500;

export interface OutboxBatch {
  changes: SyncChanges;
  /** Outbox entries whose rows are in `changes`; pass them to `ackOutbox` after a 2xx. */
  entries: OutboxRow[];
  /** Outbox entries left for a later request. */
  remaining: number;
}

const TABLES: readonly OutboxTable[] = ['unitProgress', 'cards', 'activity'];

/** Reads up to MAX_ROWS_PER_TABLE pending rows per table with their current values. */
export async function collectOutbox(db: HiChineseDb): Promise<OutboxBatch> {
  return db.transaction('r', [db.outbox, db.unitProgress, db.cards, db.activity], async () => {
    const all = await db.outbox.toArray();
    const changes = emptyChanges();
    const entries: OutboxRow[] = [];
    let remaining = 0;
    for (const table of TABLES) {
      const pending = all.filter((e) => e.table === table);
      const take = pending.slice(0, MAX_ROWS_PER_TABLE);
      remaining += pending.length - take.length;
      const keys = take.map((e) => e.rowKey);
      if (table === 'unitProgress') {
        const rows = await db.unitProgress.bulkGet(keys);
        rows.forEach((r, i) => {
          // Rows written before the completedLessons field existed read back with
          // it `undefined` (Dexie is schemaless for non-indexed columns); default
          // to [] so every pushed row satisfies UnitProgressRow.
          if (r !== undefined) changes.unitProgress.push({ ...r, completedLessons: r.completedLessons ?? [] });
          entries.push(take[i]!);
        });
      } else if (table === 'cards') {
        const rows = await db.cards.bulkGet(keys);
        rows.forEach((r, i) => {
          if (r !== undefined) changes.cards.push(r);
          entries.push(take[i]!);
        });
      } else {
        const rows = await db.activity.bulkGet(keys);
        rows.forEach((r, i) => {
          if (r !== undefined) changes.activity.push(r);
          entries.push(take[i]!);
        });
      }
    }
    return { changes, entries, remaining };
  });
}

/**
 * Removes pushed entries, unless the row changed again while the request was in
 * flight (its outbox entry now carries a newer updatedAt) — that entry stays.
 */
export async function ackOutbox(db: HiChineseDb, entries: readonly OutboxRow[]): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    const current = await db.outbox.bulkGet(entries.map((e) => e.key));
    const done: string[] = [];
    current.forEach((c, i) => {
      const pushed = entries[i]!;
      if (c !== undefined && c.updatedAt === pushed.updatedAt) done.push(c.key);
    });
    await db.outbox.bulkDelete(done);
  });
}
