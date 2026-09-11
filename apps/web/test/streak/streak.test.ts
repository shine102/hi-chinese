import { describe, expect, it } from 'vitest';
import { computeStreak } from '../../src/streak/streak.js';
import type { ActivityRow } from '@hi-chinese/content';

function activity(date: string, lessons: number, reviews: number): ActivityRow {
  return { date, lessons, reviews, updatedAt: 0 };
}

describe('computeStreak', () => {
  it('returns 0 when no activities exist', () => {
    expect(computeStreak([], '2026-09-11')).toBe(0);
  });

  it('returns 0 when today has no activity', () => {
    expect(computeStreak([activity('2026-09-10', 1, 0)], '2026-09-11')).toBe(0);
  });

  it('returns 1 when only today has activity', () => {
    expect(computeStreak([activity('2026-09-11', 0, 1)], '2026-09-11')).toBe(1);
  });

  it('counts consecutive days from today backwards', () => {
    const acts = [
      activity('2026-09-11', 1, 0),
      activity('2026-09-10', 0, 1),
      activity('2026-09-09', 1, 1),
      activity('2026-09-07', 1, 0), // gap on 2026-09-08
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(3);
  });

  it('counts a day with only reviews', () => {
    const acts = [
      activity('2026-09-11', 0, 2),
      activity('2026-09-10', 0, 1),
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(2);
  });

  it('ignores days with zero lessons and zero reviews', () => {
    const acts = [
      activity('2026-09-11', 1, 0),
      activity('2026-09-10', 0, 0), // no activity
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(1);
  });
});
