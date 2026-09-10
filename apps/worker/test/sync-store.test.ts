import { env } from 'cloudflare:workers';
import {
  emptyChanges,
  type ActivityRow,
  type CardRow,
  type SyncChanges,
  type UnitProgressRow,
} from '@hi-chinese/content';
import { beforeEach, describe, expect, it } from 'vitest';
import { applySync } from '../src/sync-store.js';

// The Cloudflare vitest plugin isolates storage per test *file*, not per
// individual test case (this file's tests otherwise share one D1 instance),
// so reset the tables and sequence counter before every test.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM unit_progress'),
    env.DB.prepare('DELETE FROM cards'),
    env.DB.prepare('DELETE FROM activity'),
    env.DB.prepare('UPDATE sync_meta SET seq = 0 WHERE id = 1'),
  ]);
});

const unit = (over: Partial<UnitProgressRow> = {}): UnitProgressRow => ({
  unitId: 'l1-u01',
  status: 'in-progress',
  completedAt: null,
  updatedAt: 1000,
  ...over,
});
const card = (over: Partial<CardRow> = {}): CardRow => ({
  cardId: 'word-recognition:w:我',
  kind: 'word-recognition',
  fsrs: {
    due: 2000,
    stability: 1,
    difficulty: 5,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    lastReview: 1000,
  },
  updatedAt: 1000,
  ...over,
});
const activity = (over: Partial<ActivityRow> = {}): ActivityRow => ({
  date: '2026-09-10',
  lessons: 1,
  reviews: 0,
  updatedAt: 1000,
  ...over,
});
const changes = (partial: Partial<SyncChanges>): SyncChanges => ({ ...emptyChanges(), ...partial });

describe('applySync', () => {
  it('returns nothing for an empty database', async () => {
    const res = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(res).toEqual({ cursor: 0, changes: emptyChanges() });
  });

  it('stores pushed rows, echoes them back, and advances the cursor', async () => {
    const res = await applySync(env.DB, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()], cards: [card()], activity: [activity()] }),
    });
    expect(res.cursor).toBe(1);
    expect(res.changes).toEqual({
      unitProgress: [unit()],
      cards: [card()],
      activity: [activity()],
    });

    const again = await applySync(env.DB, { cursor: res.cursor, changes: emptyChanges() });
    expect(again).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('applies last write wins by updatedAt', async () => {
    await applySync(env.DB, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ updatedAt: 100 })] }),
    });
    // Older write loses.
    await applySync(env.DB, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 50, updatedAt: 50 })],
      }),
    });
    let pull = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([unit({ updatedAt: 100 })]);
    // Newer write wins.
    await applySync(env.DB, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 200, updatedAt: 200 })],
      }),
    });
    pull = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([
      unit({ status: 'completed', completedAt: 200, updatedAt: 200 }),
    ]);
  });

  it('does not advance the sequence for an unchanged (losing) write of an existing row', async () => {
    await applySync(env.DB, {
      cursor: 0,
      changes: changes({ activity: [activity({ updatedAt: 100 })] }),
    });
    const res = await applySync(env.DB, {
      cursor: 1,
      changes: changes({ activity: [activity({ lessons: 9, updatedAt: 50 })] }),
    });
    // The batch still consumed a sequence number, but the losing row kept seq 1, so nothing is newer than cursor 1.
    expect(res.changes).toEqual(emptyChanges());
    expect(res.cursor).toBe(1);
  });

  it('resets a cursor that is ahead of the server', async () => {
    await applySync(env.DB, { cursor: 0, changes: changes({ cards: [card()] }) });
    const res = await applySync(env.DB, { cursor: 999, changes: emptyChanges() });
    expect(res.changes.cards).toEqual([card()]);
    expect(res.cursor).toBe(1);
  });

  it('lets a second device catch up on what the first pushed', async () => {
    const a1 = await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit()] }) });
    expect(a1.cursor).toBe(1);
    const b1 = await applySync(env.DB, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ unitId: 'l1-u02', updatedAt: 1500 })] }),
    });
    expect(b1.cursor).toBe(2);
    expect(b1.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u01', 'l1-u02']);
    const a2 = await applySync(env.DB, { cursor: a1.cursor, changes: emptyChanges() });
    expect(a2.cursor).toBe(2);
    expect(a2.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u02']);
  });

  it('round-trips fsrs state exactly', async () => {
    const c = card({
      fsrs: {
        due: 1.5,
        stability: 0.123456789,
        difficulty: 7.25,
        scheduledDays: 0,
        learningSteps: 2,
        reps: 3,
        lapses: 1,
        state: 1,
        lastReview: null,
      },
    });
    const res = await applySync(env.DB, { cursor: 0, changes: changes({ cards: [c] }) });
    expect(res.changes.cards).toEqual([c]);
  });
});
