import { useCallback, useState } from 'react';
import type { UnitState } from './unlock.js';

const KEY = 'hi-chinese:unlock-all';

export function isUnlockAllEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function writeUnlockAll(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    // private browsing / storage disabled — flag just won't persist
  }
}

export function useUnlockAll(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(isUnlockAllEnabled);
  const set = useCallback((value: boolean) => {
    writeUnlockAll(value);
    setEnabled(value);
  }, []);
  return [enabled, set];
}

/** Mutates and returns `states` with every 'locked' entry promoted to 'available' when enabled. */
export function withUnlockAll(states: Map<string, UnitState>, enabled: boolean): Map<string, UnitState> {
  if (!enabled) return states;
  for (const [id, state] of states) {
    if (state === 'locked') states.set(id, 'available');
  }
  return states;
}
