import { liveQuery } from 'dexie';
import { useCallback, useEffect, useState } from 'react';

export const PROGRESS_READ_ERROR = 'Could not read saved progress on this device.';

export interface LiveQueryResult<T> {
  /** `undefined` until the first result. */
  data: T | undefined;
  /** The last query failure, `undefined` when the query is healthy. */
  error: unknown;
  /** Re-subscribes after a failure. */
  retry: () => void;
}

/** Re-runs `querier` whenever the Dexie tables it reads change. */
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: readonly unknown[],
): LiveQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(undefined);
    const sub = liveQuery(querier).subscribe({
      next: (v) => {
        setError(undefined);
        setData(v);
      },
      error: (err: unknown) => {
        console.error('live query failed', err);
        setError(err);
      },
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's query inputs
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, retry };
}
