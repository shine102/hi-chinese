// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { isUnlockAllEnabled, useUnlockAll, withUnlockAll } from '../../src/path/unlockAll.js';

beforeEach(() => {
  localStorage.clear();
});

describe('isUnlockAllEnabled', () => {
  it('defaults to false', () => {
    expect(isUnlockAllEnabled()).toBe(false);
  });
});

describe('useUnlockAll', () => {
  it('persists the toggle to localStorage and reflects it back', () => {
    const { result } = renderHook(() => useUnlockAll());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(isUnlockAllEnabled()).toBe(true);

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(isUnlockAllEnabled()).toBe(false);
  });
});

describe('withUnlockAll', () => {
  it('leaves states untouched when disabled', () => {
    const states = new Map([['a', 'locked'], ['b', 'available']] as const);
    expect([...withUnlockAll(new Map(states), false).values()]).toEqual(['locked', 'available']);
  });

  it('promotes locked units to available when enabled', () => {
    const states = new Map([
      ['a', 'locked'],
      ['b', 'completed'],
      ['c', 'in-progress'],
    ] as const);
    expect([...withUnlockAll(states, true).values()]).toEqual(['available', 'completed', 'in-progress']);
  });
});
