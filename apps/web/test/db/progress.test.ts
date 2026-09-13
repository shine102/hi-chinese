import { cardId } from '@hi-chinese/content';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, outboxKey, type HiChineseDb } from '../../src/db/db.js';
import { getCursor, getMeta, isSetupDone, setMeta } from '../../src/db/meta.js';
import {
  completeLesson,
  markUnitStarted,
  type CompleteLessonInput,
} from '../../src/db/progress.js';
import { localDate } from '../../src/db/time.js';

let db: HiChineseDb;
beforeEach(() => {
  db = openDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

describe('meta', () => {
  it('reads defaults and round-trips values', async () => {
    expect(await getCursor(db)).toBe(0);
    expect(await isSetupDone(db)).toBe(false);
    await setMeta(db, 'cursor', 42);
    await setMeta(db, 'setupDone', true);
    await setMeta(db, 'passphrase', 'test-passphrase');
    expect(await getCursor(db)).toBe(42);
    expect(await isSetupDone(db)).toBe(true);
    expect(await getMeta<string>(db, 'passphrase')).toBe('test-passphrase');
  });
});

describe('markUnitStarted', () => {
  it('creates an in-progress row and an outbox entry once', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    await markUnitStarted(db, 'l1-u01', 2000);
    expect(await db.unitProgress.get('l1-u01')).toEqual({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      completedLessons: [],
      updatedAt: 1000,
    });
    expect(await db.outbox.toArray()).toEqual([
      { key: 'unitProgress:l1-u01', table: 'unitProgress', rowKey: 'l1-u01', updatedAt: 1000 },
    ]);
  });
});

describe('completeLesson', () => {
  const baseInput: CompleteLessonInput = {
    unitId: 'l1-u01',
    lessonIndex: 0,
    totalLessons: 3,
    wordIds: ['w:我', 'w:你'],
    characters: ['我', '你'],
    now: 5000,
  };

  it('creates an in-progress row with completedLessons=[0] for the first lesson', async () => {
    await completeLesson(db, baseInput);
    const row = await db.unitProgress.get('l1-u01');
    expect(row).toEqual({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      completedLessons: [0],
      updatedAt: 5000,
    });
  });

  it('adds to completedLessons on subsequent lessons', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, {
      ...baseInput,
      lessonIndex: 1,
      wordIds: ['w:他', 'w:是'],
      characters: ['他', '是'],
      now: 6000,
    });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.completedLessons).toEqual([0, 1]);
    expect(row?.status).toBe('in-progress');
  });

  it('marks unit completed when the last remaining lesson finishes', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, lessonIndex: 1, now: 6000 });
    await completeLesson(db, { ...baseInput, lessonIndex: 2, now: 7000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.completedLessons).toEqual([0, 1, 2]);
    expect(row?.status).toBe('completed');
    expect(row?.completedAt).toBe(7000);
  });

  it('completing sub-lessons out of order marks the right ones done, not just a count', async () => {
    // Finishing sub-lesson 2 before 0 or 1 must not register as "the first lesson done".
    await completeLesson(db, { ...baseInput, lessonIndex: 2, now: 5000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.completedLessons).toEqual([2]);
    expect(row?.status).toBe('in-progress');
  });

  it('is idempotent when the same sub-lesson is completed twice', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, now: 6000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.completedLessons).toEqual([0]);
    expect(row?.status).toBe('in-progress');
  });

  it('creates review cards only for this sub-lesson words', async () => {
    await completeLesson(db, baseInput);
    const cards = await db.cards.toArray();
    const cardIds = cards.map((c) => c.cardId).sort();
    expect(cardIds).toEqual(
      [
        cardId('char-write', '你'),
        cardId('char-write', '我'),
        cardId('word-recall', 'w:你'),
        cardId('word-recall', 'w:我'),
        cardId('word-recognition', 'w:你'),
        cardId('word-recognition', 'w:我'),
      ].sort(),
    );
  });

  it('does not duplicate cards from prior lessons', async () => {
    await completeLesson(db, baseInput);
    // Second lesson shares character '我' (would happen if a word reuses a character)
    await completeLesson(db, { ...baseInput, wordIds: ['w:他'], characters: ['他', '我'], now: 6000 });
    const charWriteCards = (await db.cards.toArray()).filter((c) => c.kind === 'char-write');
    expect(charWriteCards).toHaveLength(3); // 我, 你, 他 — not 4
  });

  it('increments the daily lesson counter per sub-lesson', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, now: 6000 });
    const date = localDate(6000);
    const day = await db.activity.get(date);
    expect(day?.lessons).toBe(2);
  });

  it('queues outbox entries for unit, cards, and activity', async () => {
    await completeLesson(db, baseInput);
    const outbox = await db.outbox.toArray();
    const tables = new Set(outbox.map((o) => o.table));
    expect(tables).toEqual(new Set(['unitProgress', 'cards', 'activity']));
  });
});
