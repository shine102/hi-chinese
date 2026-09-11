import { cardId } from '@hi-chinese/content';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, outboxKey, type HiChineseDb } from '../../src/db/db.js';
import { getCursor, getMeta, isSetupDone, setMeta } from '../../src/db/meta.js';
import {
  completeLesson,
  completeUnit,
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
      lessonsCompleted: 0,
      updatedAt: 1000,
    });
    expect(await db.outbox.toArray()).toEqual([
      { key: 'unitProgress:l1-u01', table: 'unitProgress', rowKey: 'l1-u01', updatedAt: 1000 },
    ]);
  });
});

describe('completeUnit', () => {
  const input = {
    unitId: 'l1-u01',
    wordIds: ['w:我', 'w:你们'],
    characters: ['我', '你', '们'],
    now: 5000,
  };

  it('marks the unit completed with a monotonic updatedAt', async () => {
    await markUnitStarted(db, 'l1-u01', 9000); // clock was ahead earlier
    await completeUnit(db, input);
    expect(await db.unitProgress.get('l1-u01')).toEqual({
      unitId: 'l1-u01',
      status: 'completed',
      completedAt: 5000,
      lessonsCompleted: 0,
      updatedAt: 9001,
    });
    expect(await db.outbox.get(outboxKey('unitProgress', 'l1-u01'))).toMatchObject({
      updatedAt: 9001,
    });
  });

  it('creates two cards per word and one per character with empty FSRS state', async () => {
    await completeUnit(db, input);
    const cards = await db.cards.toArray();
    expect(cards.map((c) => c.cardId).sort()).toEqual(
      [
        cardId('word-recognition', 'w:我'),
        cardId('word-recall', 'w:我'),
        cardId('word-recognition', 'w:你们'),
        cardId('word-recall', 'w:你们'),
        cardId('char-write', '我'),
        cardId('char-write', '你'),
        cardId('char-write', '们'),
      ].sort(),
    );
    const one = cards.find((c) => c.cardId === cardId('char-write', '们'));
    expect(one).toMatchObject({ kind: 'char-write', updatedAt: 5000 });
    expect(one?.fsrs).toMatchObject({ due: 5000, state: 0, reps: 0, lastReview: null });
    const outboxKeys = (await db.outbox.toArray()).map((o) => o.key).sort();
    expect(outboxKeys).toHaveLength(1 + 7 + 1); // unit + cards + activity
  });

  it('does not overwrite cards that already exist', async () => {
    await completeUnit(db, input);
    const before = await db.cards.get(cardId('word-recall', 'w:我'));
    await db.cards.put({ ...before!, fsrs: { ...before!.fsrs, reps: 9 }, updatedAt: 7000 });
    await db.outbox.clear();
    await completeUnit(db, { ...input, now: 8000 });
    const after = await db.cards.get(cardId('word-recall', 'w:我'));
    expect(after?.fsrs.reps).toBe(9);
    expect(after?.updatedAt).toBe(7000);
    const outbox = await db.outbox.toArray();
    expect(outbox.map((o) => o.table).sort()).toEqual(['activity', 'unitProgress']);
  });

  it("increments today's lesson counter", async () => {
    await completeUnit(db, input);
    await completeUnit(db, { ...input, unitId: 'l1-u02', now: 6000 });
    const date = localDate(6000);
    expect(await db.activity.get(date)).toEqual({ date, lessons: 2, reviews: 0, updatedAt: 6000 });
  });
});

describe('completeLesson', () => {
  const baseInput: CompleteLessonInput = {
    unitId: 'l1-u01',
    totalLessons: 3,
    wordIds: ['w:我', 'w:你'],
    characters: ['我', '你'],
    now: 5000,
  };

  it('creates an in-progress row with lessonsCompleted=1 for the first lesson', async () => {
    await completeLesson(db, baseInput);
    const row = await db.unitProgress.get('l1-u01');
    expect(row).toEqual({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      lessonsCompleted: 1,
      updatedAt: 5000,
    });
  });

  it('increments lessonsCompleted on subsequent lessons', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, wordIds: ['w:他', 'w:是'], characters: ['他', '是'], now: 6000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.lessonsCompleted).toBe(2);
    expect(row?.status).toBe('in-progress');
  });

  it('marks unit completed when last lesson finishes', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, now: 6000 });
    await completeLesson(db, { ...baseInput, now: 7000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.lessonsCompleted).toBe(3);
    expect(row?.status).toBe('completed');
    expect(row?.completedAt).toBe(7000);
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
