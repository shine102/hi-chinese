import { describe, expect, it } from 'vitest';
import { MAX_ROWS_PER_TABLE, parseSyncRequest } from '../src/sync-request.js';

const fsrs = {
  due: 1_700_000_000_000,
  stability: 1.5,
  difficulty: 5.2,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 2,
  lastReview: 1_699_900_000_000,
};

const valid = {
  cursor: 3,
  changes: {
    unitProgress: [
      {
        unitId: 'l1-u01',
        status: 'completed',
        completedAt: 1_700_000_000_000,
        lessonsCompleted: 3,
        updatedAt: 1_700_000_000_001,
      },
    ],
    cards: [
      {
        cardId: 'word-recognition:w:我',
        kind: 'word-recognition',
        fsrs,
        updatedAt: 1_700_000_000_002,
      },
    ],
    activity: [{ date: '2026-09-10', lessons: 1, reviews: 0, updatedAt: 1_700_000_000_003 }],
  },
};

const fail = (input: unknown) => {
  const r = parseSyncRequest(input);
  if (r.ok) throw new Error('expected failure');
  return r.error;
};

describe('parseSyncRequest', () => {
  it('accepts a valid request and strips unknown fields', () => {
    const r = parseSyncRequest({
      ...valid,
      extra: 1,
      changes: { ...valid.changes, cards: [{ ...valid.changes.cards[0], junk: true }] },
    });
    expect(r).toEqual({ ok: true, value: valid });
  });
  it('accepts empty change sets', () => {
    expect(
      parseSyncRequest({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } }),
    ).toEqual({
      ok: true,
      value: { cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } },
    });
  });
  it('rejects non-objects and bad cursors', () => {
    expect(fail(null)).toMatch(/^body: /);
    expect(fail([])).toMatch(/^body: /);
    expect(fail({ ...valid, cursor: -1 })).toMatch(/^cursor: /);
    expect(fail({ ...valid, cursor: 1.5 })).toMatch(/^cursor: /);
    expect(fail({ ...valid, cursor: '3' })).toMatch(/^cursor: /);
  });
  it('rejects missing change arrays', () => {
    expect(fail({ cursor: 0, changes: { unitProgress: [], cards: [] } })).toMatch(
      /^changes\.activity: /,
    );
    expect(fail({ cursor: 0 })).toMatch(/^changes: /);
  });
  it('rejects bad unit progress rows', () => {
    const row = valid.changes.unitProgress[0]!;
    expect(
      fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, status: 'done' }] } }),
    ).toMatch(/^changes\.unitProgress\[0\]\.status: /);
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, unitProgress: [{ ...row, completedAt: 1.5 }] },
      }),
    ).toMatch(/completedAt/);
    expect(
      fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, updatedAt: 0 }] } }),
    ).toMatch(/updatedAt/);
    expect(
      fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, unitId: '' }] } }),
    ).toMatch(/unitId/);
  });
  it('rejects a unitId longer than 200 characters', () => {
    const row = valid.changes.unitProgress[0]!;
    const unitId = 'x'.repeat(201);
    expect(
      fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, unitId }] } }),
    ).toBe('changes.unitProgress[0].unitId: expected string of at most 200 chars');
  });
  it('rejects a negative completedAt', () => {
    const row = valid.changes.unitProgress[0]!;
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, unitProgress: [{ ...row, completedAt: -1 }] },
      }),
    ).toMatch(/completedAt/);
  });
  it('rejects bad card rows', () => {
    const row = valid.changes.cards[0]!;
    expect(
      fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, kind: 'word-recall' }] } }),
    ).toMatch(/^changes\.cards\[0\]\.kind: /);
    expect(
      fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, cardId: 'nope' }] } }),
    ).toMatch(/cardId/);
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, state: 4 } }] },
      }),
    ).toMatch(/fsrs\.state/);
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, stability: 'x' } }] },
      }),
    ).toMatch(/fsrs\.stability/);
    expect(
      fail({
        ...valid,
        changes: {
          ...valid.changes,
          cards: [{ ...row, fsrs: { ...fsrs, lastReview: undefined } }],
        },
      }),
    ).toMatch(/fsrs\.lastReview/);
  });
  it('rejects a cardId longer than 200 characters', () => {
    const row = valid.changes.cards[0]!;
    const cardId = `word-recognition:${'w'.repeat(190)}`;
    expect(cardId.length).toBeGreaterThan(200);
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, cardId }] } })).toBe(
      'changes.cards[0].cardId: expected string of at most 200 chars',
    );
  });
  it('rejects fractional fsrs counters', () => {
    const row = valid.changes.cards[0]!;
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, reps: 1.5 } }] },
      }),
    ).toMatch(/^changes\.cards\[0\]\.fsrs\.reps: /);
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, lapses: -1 } }] },
      }),
    ).toMatch(/^changes\.cards\[0\]\.fsrs\.lapses: /);
  });
  it('rejects bad activity rows', () => {
    const row = valid.changes.activity[0]!;
    expect(
      fail({ ...valid, changes: { ...valid.changes, activity: [{ ...row, date: '2026-9-1' }] } }),
    ).toMatch(/^changes\.activity\[0\]\.date: /);
    expect(
      fail({ ...valid, changes: { ...valid.changes, activity: [{ ...row, lessons: -1 }] } }),
    ).toMatch(/lessons/);
  });
  it('rejects a calendar date that does not exist', () => {
    const row = valid.changes.activity[0]!;
    expect(
      fail({
        ...valid,
        changes: { ...valid.changes, activity: [{ ...row, date: '2026-13-45' }] },
      }),
    ).toMatch(/^changes\.activity\[0\]\.date: /);
  });
  it('rejects oversized batches', () => {
    const many = Array.from({ length: MAX_ROWS_PER_TABLE + 1 }, (_, i) => ({
      ...valid.changes.activity[0]!,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    expect(fail({ ...valid, changes: { ...valid.changes, activity: many } })).toMatch(
      /^changes\.activity: too many rows/,
    );
  });
});
