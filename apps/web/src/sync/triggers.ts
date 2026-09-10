import { isSetupDone } from '../db/meta.js';
import type { SyncDeps } from './client.js';
import { requestSync } from './store.js';

/**
 * Spec §7: sync on app start when online and whenever connectivity returns.
 * Session-end syncs are triggered by the practice screen itself.
 */
export function installSyncTriggers(deps: SyncDeps): () => void {
  const run = () => {
    void isSetupDone(deps.db).then((done) => {
      if (done) void requestSync(deps);
    });
  };
  run();
  window.addEventListener('online', run);
  return () => window.removeEventListener('online', run);
}
