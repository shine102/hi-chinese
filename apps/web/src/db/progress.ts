import { cardId, type CardKind, type CardRow, type FsrsState } from '@hi-chinese/content';
import { emptyFsrsState } from '../fsrs/state.js';
import { outboxEntry, type HiChineseDb, type OutboxRow } from './db.js';
import { localDate, nextUpdatedAt } from './time.js';

/** Records that the learner opened a unit. No-op if the unit already has a row. */
export async function markUnitStarted(db: HiChineseDb, unitId: string, now: number): Promise<void> {
  await db.transaction('rw', [db.unitProgress, db.outbox], async () => {
    if ((await db.unitProgress.get(unitId)) !== undefined) return;
    const updatedAt = nextUpdatedAt(undefined, now);
    await db.unitProgress.put({
      unitId,
      status: 'in-progress',
      completedAt: null,
      completedLessons: [],
      updatedAt,
    });
    await db.outbox.put(outboxEntry('unitProgress', unitId, updatedAt));
  });
}

export interface CompleteLessonInput {
  unitId: string;
  /** Index of the sub-lesson just finished (Lesson.index from computeLessons) */
  lessonIndex: number;
  /** Total lessons in this unit (from lessonCount) */
  totalLessons: number;
  /** Word IDs learned in this specific sub-lesson */
  wordIds: readonly string[];
  /** Characters from this sub-lesson's words */
  characters: readonly string[];
  now: number;
}

/**
 * Records completion of one sub-lesson within a unit: adds `lessonIndex` to
 * the set of completed sub-lessons (idempotent — finishing the same
 * sub-lesson twice, e.g. out of order, doesn't double count), creates review
 * cards for only this sub-lesson's words and characters (skipping ones that
 * already exist), counts a lesson for today, and marks the unit completed
 * once every sub-lesson has been finished. One transaction: either all of it
 * lands or none.
 */
export async function completeLesson(db: HiChineseDb, input: CompleteLessonInput): Promise<void> {
  const { unitId, lessonIndex, totalLessons, now } = input;
  await db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    const prev = await db.unitProgress.get(unitId);
    const completedLessons = Array.from(
      new Set([...(prev?.completedLessons ?? []), lessonIndex]),
    ).sort((a, b) => a - b);
    const done = completedLessons.length >= totalLessons;
    const unitUpdatedAt = nextUpdatedAt(prev?.updatedAt, now);
    await db.unitProgress.put({
      unitId,
      status: done ? 'completed' : 'in-progress',
      completedAt: done ? now : null,
      completedLessons,
      updatedAt: unitUpdatedAt,
    });
    outbox.push(outboxEntry('unitProgress', unitId, unitUpdatedAt));

    // Create review cards for this sub-lesson's words and characters
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

export interface ReviewGradeInput {
  cardId: string;
  newFsrs: FsrsState;
}

export async function completeReviewSession(
  db: HiChineseDb,
  grades: readonly ReviewGradeInput[],
  now: number,
): Promise<void> {
  await db.transaction('rw', [db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    for (const { cardId: cid, newFsrs } of grades) {
      const existing = await db.cards.get(cid);
      if (!existing) continue;
      const updatedAt = nextUpdatedAt(existing.updatedAt, now);
      await db.cards.put({ ...existing, fsrs: newFsrs, updatedAt });
      outbox.push(outboxEntry('cards', cid, updatedAt));
    }

    const date = localDate(now);
    const day = await db.activity.get(date);
    const dayUpdatedAt = nextUpdatedAt(day?.updatedAt, now);
    await db.activity.put({
      date,
      lessons: day?.lessons ?? 0,
      reviews: (day?.reviews ?? 0) + 1,
      updatedAt: dayUpdatedAt,
    });
    outbox.push(outboxEntry('activity', date, dayUpdatedAt));

    await db.outbox.bulkPut(outbox);
  });
}
