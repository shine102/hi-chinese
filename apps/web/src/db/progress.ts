import { cardId, type CardKind, type CardRow } from '@hi-chinese/content';
import { emptyFsrsState } from '../fsrs/state.js';
import { outboxEntry, type HiChineseDb, type OutboxRow } from './db.js';
import { localDate, nextUpdatedAt } from './time.js';

/** Records that the learner opened a unit. No-op if the unit already has a row. */
export async function markUnitStarted(db: HiChineseDb, unitId: string, now: number): Promise<void> {
  await db.transaction('rw', [db.unitProgress, db.outbox], async () => {
    if ((await db.unitProgress.get(unitId)) !== undefined) return;
    const updatedAt = nextUpdatedAt(undefined, now);
    await db.unitProgress.put({ unitId, status: 'in-progress', completedAt: null, updatedAt });
    await db.outbox.put(outboxEntry('unitProgress', unitId, updatedAt));
  });
}

export interface CompleteUnitInput {
  unitId: string;
  wordIds: readonly string[];
  characters: readonly string[];
  now: number;
}

/**
 * Marks the unit completed, creates review cards for its words and characters
 * (only those that do not exist yet), counts a lesson for today, and queues every
 * written row in the outbox. One transaction: either all of it lands or none.
 */
export async function completeUnit(db: HiChineseDb, input: CompleteUnitInput): Promise<void> {
  const { unitId, now } = input;
  await db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    const prev = await db.unitProgress.get(unitId);
    const unitUpdatedAt = nextUpdatedAt(prev?.updatedAt, now);
    await db.unitProgress.put({
      unitId,
      status: 'completed',
      completedAt: now,
      updatedAt: unitUpdatedAt,
    });
    outbox.push(outboxEntry('unitProgress', unitId, unitUpdatedAt));

    const wanted: { id: string; kind: CardKind }[] = [];
    for (const w of input.wordIds) {
      wanted.push({ id: cardId('word-recognition', w), kind: 'word-recognition' });
      wanted.push({ id: cardId('word-recall', w), kind: 'word-recall' });
    }
    for (const ch of input.characters)
      wanted.push({ id: cardId('char-write', ch), kind: 'char-write' });
    const existing = await db.cards.bulkGet(wanted.map((c) => c.id));
    const fresh: CardRow[] = [];
    wanted.forEach((c, i) => {
      if (existing[i] !== undefined) return;
      fresh.push({ cardId: c.id, kind: c.kind, fsrs: emptyFsrsState(now), updatedAt: now });
      outbox.push(outboxEntry('cards', c.id, now));
    });
    if (fresh.length > 0) await db.cards.bulkPut(fresh);

    const date = localDate(now);
    const day = await db.activity.get(date);
    const dayUpdatedAt = nextUpdatedAt(day?.updatedAt, now);
    await db.activity.put({
      date,
      lessons: (day?.lessons ?? 0) + 1,
      reviews: day?.reviews ?? 0,
      updatedAt: dayUpdatedAt,
    });
    outbox.push(outboxEntry('activity', date, dayUpdatedAt));

    await db.outbox.bulkPut(outbox);
  });
}
