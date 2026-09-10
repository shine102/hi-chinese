import { createEmptyCard } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { emptyFsrsState, fromFsrsState, toFsrsState } from '../../src/fsrs/state.js';

describe('FSRS state conversion', () => {
  it('creates an empty card due now in state New with no last review', () => {
    const now = Date.UTC(2026, 8, 10, 12, 0, 0);
    expect(emptyFsrsState(now)).toEqual({
      due: now,
      stability: 0,
      difficulty: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
    });
  });

  it('round-trips through ts-fsrs Card', () => {
    const now = new Date(Date.UTC(2026, 8, 10));
    const card = {
      ...createEmptyCard(now),
      reps: 3,
      lapses: 1,
      last_review: now,
      state: 2 as const,
    };
    const state = toFsrsState(card);
    expect(state.lastReview).toBe(now.getTime());
    const back = fromFsrsState(state);
    expect(back.due.getTime()).toBe(card.due.getTime());
    expect(back.last_review?.getTime()).toBe(now.getTime());
    expect(back.reps).toBe(3);
    expect(back.lapses).toBe(1);
    expect(back.state).toBe(2);
    expect(toFsrsState(back)).toEqual(state);
  });
});
