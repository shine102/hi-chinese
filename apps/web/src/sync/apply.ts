import type { SyncChanges } from '@hi-chinese/content';
import { outboxKey, type HiChineseDb } from '../db/db.js';
import { pickWinners } from './merge.js';

/**
 * Writes the remote rows that win last-write-wins and drops outbox entries for
 * rows the remote superseded (their pending local value is stale). Returns the
 * number of rows written.
 */
export async function applyRemoteChanges(db: HiChineseDb, changes: SyncChanges): Promise<number> {
  return db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    let written = 0;
    const staleOutbox: string[] = [];

    const localUnits = await db.unitProgress.bulkGet(changes.unitProgress.map((r) => r.unitId));
    const unitWinners = pickWinners(
      changes.unitProgress,
      new Map(localUnits.flatMap((r) => (r ? [[r.unitId, r] as const] : []))),
      (r) => r.unitId,
    );
    await db.unitProgress.bulkPut(unitWinners);
    unitWinners.forEach((r) => staleOutbox.push(outboxKey('unitProgress', r.unitId)));
    written += unitWinners.length;

    const localCards = await db.cards.bulkGet(changes.cards.map((r) => r.cardId));
    const cardWinners = pickWinners(
      changes.cards,
      new Map(localCards.flatMap((r) => (r ? [[r.cardId, r] as const] : []))),
      (r) => r.cardId,
    );
    await db.cards.bulkPut(cardWinners);
    cardWinners.forEach((r) => staleOutbox.push(outboxKey('cards', r.cardId)));
    written += cardWinners.length;

    const localDays = await db.activity.bulkGet(changes.activity.map((r) => r.date));
    const dayWinners = pickWinners(
      changes.activity,
      new Map(localDays.flatMap((r) => (r ? [[r.date, r] as const] : []))),
      (r) => r.date,
    );
    await db.activity.bulkPut(dayWinners);
    dayWinners.forEach((r) => staleOutbox.push(outboxKey('activity', r.date)));
    written += dayWinners.length;

    if (staleOutbox.length > 0) await db.outbox.bulkDelete(staleOutbox);
    return written;
  });
}
