import { useSyncExternalStore } from 'react';
import { syncOnce, type SyncDeps, type SyncOutcome, type SyncResult } from './client.js';

export type SyncStatus = 'idle' | 'syncing' | SyncOutcome;

export interface SyncState {
  status: SyncStatus;
  lastResult: SyncResult | null;
  lastSyncedAt: number | null;
}

let state: SyncState = { status: 'idle', lastResult: null, lastSyncedAt: null };
let inFlight: Promise<SyncResult> | null = null;
const listeners = new Set<() => void>();

function set(next: SyncState): void {
  state = next;
  for (const l of listeners) l();
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
}

/** Runs a sync unless one is already running, in which case the running one is returned. */
export function requestSync(deps: SyncDeps): Promise<SyncResult> {
  if (inFlight) return inFlight;
  set({ ...state, status: 'syncing' });
  inFlight = syncOnce(deps)
    .then((result) => {
      set({
        status: result.status,
        lastResult: result,
        lastSyncedAt: result.status === 'synced' ? Date.now() : state.lastSyncedAt,
      });
      return result;
    })
    .catch((err: unknown): SyncResult => {
      // syncOnce is documented to never throw, but this backstop keeps status
      // from ever getting stuck on 'syncing' if it (or a future change to it)
      // does reject.
      console.error('sync failed', err);
      const result: SyncResult = { status: 'error', pushed: 0, pulled: 0 };
      set({ status: 'error', lastResult: state.lastResult, lastSyncedAt: state.lastSyncedAt });
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function resetSyncStateForTests(): void {
  state = { status: 'idle', lastResult: null, lastSyncedAt: null };
  inFlight = null;
  listeners.clear();
}
