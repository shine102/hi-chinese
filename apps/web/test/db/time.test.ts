import { describe, expect, it } from 'vitest';
import { localDate, nextUpdatedAt } from '../../src/db/time.js';

describe('nextUpdatedAt', () => {
  it('uses now when there is no previous value', () => {
    expect(nextUpdatedAt(undefined, 1000)).toBe(1000);
  });
  it('is strictly greater than the previous value even when the clock went backwards', () => {
    expect(nextUpdatedAt(5000, 1000)).toBe(5001);
    expect(nextUpdatedAt(1000, 1000)).toBe(1001);
    expect(nextUpdatedAt(1000, 2000)).toBe(2000);
  });
});

describe('localDate', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    const d = new Date(2026, 8, 5, 23, 59); // 5 September 2026, local time
    expect(localDate(d.getTime())).toBe('2026-09-05');
  });
});
