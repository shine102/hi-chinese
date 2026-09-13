import { env } from 'cloudflare:workers';
import {
  emptyChanges,
  type ActivityRow,
  type CardRow,
  type SyncChanges,
  type UnitProgressRow,
} from '@hi-chinese/content';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_ROWS_PER_TABLE } from '../src/sync-request.js';
import { applySync } from '../src/sync-store.js';

// The Cloudflare vitest plugin isolates storage per test *file*, not per
// individual test case (this file's tests otherwise share one D1 instance),
// so reset the tables and sequence counter before every test.
//
// These tests call applySync directly (bypassing the auth middleware that
// normally looks up a user_id from `users`), so the synthetic user ids below
// must exist for themselves: unit_progress/cards/activity all carry a
// `user_id REFERENCES users(user_id)`, and D1 enforces that foreign key by
// default in production too — not just here (see the comment in
// migrations/0004_multi_user.sql). The inserts are idempotent so they're
// safe to repeat every test.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES ('user-a', 'user-a-hash', 'User A', 0) ON CONFLICT(user_id) DO NOTHING",
    ),
    env.DB.prepare(
      "INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES ('user-b', 'user-b-hash', 'User B', 0) ON CONFLICT(user_id) DO NOTHING",
    ),
    env.DB.prepare('DELETE FROM unit_progress'),
    env.DB.prepare('DELETE FROM cards'),
    env.DB.prepare('DELETE FROM activity'),
    env.DB.prepare('UPDATE sync_meta SET seq = 0 WHERE id = 1'),
  ]);
});

const USER = 'user-a';

const unit = (over: Partial<UnitProgressRow> = {}): UnitProgressRow => ({
  unitId: 'l1-u01',
  status: 'in-progress',
  completedAt: null,
  completedLessons: [],
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
    const res = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(res).toEqual({ cursor: 0, changes: emptyChanges() });
  });

  it('stores pushed rows, echoes them back, and advances the cursor', async () => {
    const res = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()], cards: [card()], activity: [activity()] }),
    });
    expect(res.cursor).toBe(1);
    expect(res.changes).toEqual({
      unitProgress: [unit()],
      cards: [card()],
      activity: [activity()],
    });

    const again = await applySync(env.DB, USER, { cursor: res.cursor, changes: emptyChanges() });
    expect(again).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('applies last write wins by updatedAt', async () => {
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ updatedAt: 100 })] }),
    });
    // Older write loses.
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 50, updatedAt: 50 })],
      }),
    });
    let pull = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([unit({ updatedAt: 100 })]);
    // Newer write wins.
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 200, updatedAt: 200 })],
      }),
    });
    pull = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([
      unit({ status: 'completed', completedAt: 200, updatedAt: 200 }),
    ]);
  });

  it('does not advance the sequence for an unchanged (losing) write of an existing row', async () => {
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ activity: [activity({ updatedAt: 100 })] }),
    });
    const res = await applySync(env.DB, USER, {
      cursor: 1,
      changes: changes({ activity: [activity({ lessons: 9, updatedAt: 50 })] }),
    });
    // The batch still consumed a sequence number, but the losing row kept seq 1, so nothing is newer than cursor 1.
    expect(res.changes).toEqual(emptyChanges());
    expect(res.cursor).toBe(1);
  });

  it('resets a cursor that is ahead of the server', async () => {
    await applySync(env.DB, USER, { cursor: 0, changes: changes({ cards: [card()] }) });
    const res = await applySync(env.DB, USER, { cursor: 999, changes: emptyChanges() });
    expect(res.changes.cards).toEqual([card()]);
    expect(res.cursor).toBe(1);
  });

  it('lets a second device catch up on what the first pushed', async () => {
    const a1 = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()] }),
    });
    expect(a1.cursor).toBe(1);
    const b1 = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ unitId: 'l1-u02', updatedAt: 1500 })] }),
    });
    expect(b1.cursor).toBe(2);
    expect(b1.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u01', 'l1-u02']);
    const a2 = await applySync(env.DB, USER, { cursor: a1.cursor, changes: emptyChanges() });
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
    const res = await applySync(env.DB, USER, { cursor: 0, changes: changes({ cards: [c] }) });
    expect(res.changes.cards).toEqual([c]);
  });

  it('accepts exactly MAX_ROWS_PER_TABLE rows per table in one push', async () => {
    const startDate = new Date('2020-01-01T00:00:00Z');
    const dateAt = (i: number) => {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    };
    const unitProgress = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      unit({ unitId: `l1-u${i}` }),
    );
    const cards = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      card({ cardId: `word-recall:w:x${i}`, kind: 'word-recall' }),
    );
    const activityRows = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      activity({ date: dateAt(i) }),
    );

    const res = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress, cards, activity: activityRows }),
    });
    expect(res.changes.unitProgress).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.changes.cards).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.changes.activity).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.cursor).toBe(1);

    const pull = await applySync(env.DB, USER, { cursor: res.cursor, changes: emptyChanges() });
    expect(pull).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('isolates rows between users, even when they share the same unit id', async () => {
    await applySync(env.DB, 'user-a', {
      cursor: 0,
      changes: changes({ unitProgress: [unit()] }),
    });
    await applySync(env.DB, 'user-b', {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 500, updatedAt: 500 })],
      }),
    });

    const pullA = await applySync(env.DB, 'user-a', { cursor: 0, changes: emptyChanges() });
    const pullB = await applySync(env.DB, 'user-b', { cursor: 0, changes: emptyChanges() });

    expect(pullA.changes.unitProgress).toEqual([unit()]);
    expect(pullB.changes.unitProgress).toEqual([
      unit({ status: 'completed', completedAt: 500, updatedAt: 500 }),
    ]);
  });
});
