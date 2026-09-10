import { useRegisterSW } from 'virtual:pwa-register/react';

/** Spec §8: a new app version is offered as a toast, never applied mid-session. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg bg-stone-900 px-4 py-3 text-white shadow-lg"
    >
      <span>A new version is available.</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-md bg-white px-3 py-1 text-sm font-medium text-stone-900"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="px-2 text-sm underline"
        >
          Later
        </button>
      </div>
    </div>
  );
}
