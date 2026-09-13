import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { db } from '../db/db.js';
import { setMeta } from '../db/meta.js';
import { requestSync } from '../sync/store.js';

export function SetupScreen() {
  const navigate = useNavigate();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineOffer, setOfflineOffer] = useState(false);

  async function finish(): Promise<void> {
    await setMeta(db, 'setupDone', true);
    await navigate({ to: '/' });
  }

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOfflineOffer(false);
    await setMeta(db, 'passphrase', passphrase.trim());
    const result = await requestSync({ db });
    setBusy(false);
    if (result.status === 'synced' || result.status === 'pending') {
      await finish();
      return;
    }
    if (result.status === 'unauthorized') {
      setError('That passphrase was rejected. Check it and try again.');
      return;
    }
    setError(
      result.status === 'offline'
        ? 'You are offline. Connect to pull your progress, or continue offline for now.'
        : 'Could not reach the sync server. Try again, or continue offline for now.',
    );
    setOfflineOffer(true);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto mt-8 flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-stone-600">
        Enter your passphrase to load your progress on this device.
      </p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your passphrase
        <input
          type="password"
          autoComplete="off"
          required
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-base"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || passphrase.trim() === ''}
        className="rounded-md bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Continue'}
      </button>
      {offlineOffer && (
        <button type="button" onClick={() => void finish()} className="text-sm underline">
          Continue offline
        </button>
      )}
    </form>
  );
}
