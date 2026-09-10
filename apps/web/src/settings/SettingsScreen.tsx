import { useState, type FormEvent } from 'react';
import { useHasChineseVoice } from '../audio/speech.js';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { setMeta } from '../db/meta.js';
import { requestSync, useSyncState } from '../sync/store.js';
import { SyncIndicator } from '../ui/Header.js';

export function SettingsScreen() {
  const content = useContent();
  const sync = useSyncState();
  const hasVoice = useHasChineseVoice();
  const [passphrase, setPassphrase] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function savePassphrase(e: FormEvent): Promise<void> {
    e.preventDefault();
    await setMeta(db, 'passphrase', passphrase.trim());
    setPassphrase('');
    const result = await requestSync({ db });
    setMessage(
      result.status === 'unauthorized' ? 'That passphrase was rejected.' : 'Passphrase saved.',
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Sync</h2>
        <SyncIndicator />
        {sync.lastSyncedAt !== null && (
          <p className="text-sm text-stone-600">
            Last synced {new Date(sync.lastSyncedAt).toLocaleString()}
          </p>
        )}
        <button
          type="button"
          onClick={() => void requestSync({ db })}
          disabled={sync.status === 'syncing'}
          className="self-start rounded-md border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Sync now
        </button>
      </section>

      <form onSubmit={(e) => void savePassphrase(e)} className="flex flex-col gap-2">
        <h2 className="font-semibold">Passphrase</h2>
        <label className="flex flex-col gap-1 text-sm">
          New passphrase
          <input
            type="password"
            autoComplete="off"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={passphrase.trim() === ''}
          className="self-start rounded-md bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Save passphrase
        </button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </form>

      <section className="flex flex-col gap-1 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-900">Audio</h2>
        <p>
          {hasVoice
            ? 'Chinese voice: available.'
            : 'Chinese voice: not installed. Audio buttons are disabled.'}
        </p>
      </section>

      <section className="flex flex-col gap-1 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-900">Content</h2>
        <p>
          Version {content.manifest.version}: {content.manifest.counts.words} words in{' '}
          {content.manifest.counts.units} units.
        </p>
      </section>
    </div>
  );
}
