import { Outlet } from '@tanstack/react-router';
import { ContentGate, ContentProvider } from '../content/provider.js';
import type { ContentIndex } from '../content/index.js';
import { db } from '../db/db.js';
import { setMeta } from '../db/meta.js';
import { Header } from './Header.js';
import { UpdateToast } from './UpdateToast.js';

function rememberContentVersion(index: ContentIndex): void {
  void setMeta(db, 'contentVersion', index.manifest.version);
}

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-stone-50">
      <Header />
      <main className="flex-1 px-4 py-4">
        <ContentProvider onReady={rememberContentVersion}>
          <ContentGate>
            <Outlet />
          </ContentGate>
        </ContentProvider>
      </main>
      <UpdateToast />
    </div>
  );
}
