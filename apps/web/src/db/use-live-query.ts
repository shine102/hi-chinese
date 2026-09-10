import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/** Re-runs `querier` whenever the Dexie tables it reads change. `undefined` until the first result. */
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: readonly unknown[],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: (v) => setValue(v),
      error: (err: unknown) => console.error('live query failed', err),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's query inputs
  }, deps);
  return value;
}
