import { Link } from '@tanstack/react-router';
import { useSyncState, type SyncStatus } from '../sync/store.js';

const LABELS: Record<SyncStatus, string> = {
  idle: 'Not synced yet',
  syncing: 'Syncing…',
  synced: 'Synced',
  pending: 'Pending',
  offline: 'Offline',
  unauthorized: 'Passphrase needed',
  error: 'Sync failed',
};

const DOTS: Record<SyncStatus, string> = {
  idle: 'bg-stone-400',
  syncing: 'bg-amber-400 animate-pulse',
  synced: 'bg-green-500',
  pending: 'bg-amber-500',
  offline: 'bg-stone-400',
  unauthorized: 'bg-red-500',
  error: 'bg-red-500',
};

export function SyncIndicator() {
  const { status } = useSyncState();
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`inline-block h-2.5 w-2.5 rounded-full ${DOTS[status]}`}
      />
      <span data-testid="sync-status">{LABELS[status]}</span>
    </>
  );
  const cls = 'flex items-center gap-1.5 text-sm text-stone-600';
  if (status === 'unauthorized') {
    return (
      <Link to="/settings" className={`${cls} underline`}>
        {body}
      </Link>
    );
  }
  return <span className={cls}>{body}</span>;
}

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
      <Link to="/" className="text-lg font-semibold">
        Hi Chinese
      </Link>
      <div className="flex items-center gap-4">
        <SyncIndicator />
        <Link to="/settings" className="text-sm text-stone-600 underline">
          Settings
        </Link>
      </div>
    </header>
  );
}
