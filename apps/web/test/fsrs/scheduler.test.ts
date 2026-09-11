import { cardId } from '@hi-chinese/content';
import { Rating } from 'ts-fsrs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, type HiChineseDb } from '../../src/db/db.js';
import { emptyFsrsState } from '../../src/fsrs/state.js';
import { gradeCard, getDueCards, getDueCount, MAX_REVIEW_CARDS } from '../../src/fsrs/scheduler.js';

describe('gradeCard', () => {
  const now = Date.now();
  const fresh = emptyFsrsState(now);

  it('advances a new card past New state after grading Good', () => {
    const next = gradeCard(fresh, Rating.Good, now);
    expect(next.state).not.toBe(0); // no longer New
    expect(next.reps).toBe(1);
    expect(next.due).toBeGreaterThan(now);
    expect(next.lastReview).toBe(now);
  });

  it('keeps a card in learning after Again', () => {
    const next = gradeCard(fresh, Rating.Again, now);
    expect(next.lapses).toBeGreaterThanOrEqual(0);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(now);
  });

  it('schedules further out for Easy than Good', () => {
    const afterGood = gradeCard(fresh, Rating.Good, now);
    const afterEasy = gradeCard(fresh, Rating.Easy, now);
    expect(afterEasy.due).toBeGreaterThanOrEqual(afterGood.due);
  });

  it('MAX_REVIEW_CARDS is 50', () => {
    expect(MAX_REVIEW_CARDS).toBe(50);
  });
});

describe('getDueCards / getDueCount', () => {
  let db: HiChineseDb;

  beforeEach(() => {
    db = openDb(`test-scheduler-${Date.now()}`);
  });
  afterEach(async () => {
    await db.delete();
  });

  const now = 1_700_000_000_000;

  async function seedCards(count: number, dueOffset: number, offset = 0) {
    const cards = Array.from({ length: count }, (_, i) => ({
      cardId: cardId('word-recognition', `w:test${offset + i}`),
      kind: 'word-recognition' as const,
      fsrs: { ...emptyFsrsState(now), due: now + dueOffset },
      updatedAt: now,
    }));
    await db.cards.bulkPut(cards);
  }

  it('returns only cards due at or before now', async () => {
    await seedCards(3, -1000); // due in the past
    await seedCards(2, 60_000, 3); // due in the future
    const due = await getDueCards(db, now);
    expect(due).toHaveLength(3);
    const count = await getDueCount(db, now);
    expect(count).toBe(3);
  });

  it('caps at MAX_REVIEW_CARDS', async () => {
    await seedCards(60, -1000);
    const due = await getDueCards(db, now);
    expect(due).toHaveLength(50);
  });
});
