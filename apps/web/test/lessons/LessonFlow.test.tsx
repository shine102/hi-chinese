// @vitest-environment jsdom
import type { SyncRequest, SyncResponse } from '@hi-chinese/content';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/db.js';
import { createAppRouter } from '../../src/router.js';
import { resetSyncStateForTests } from '../../src/sync/store.js';
import { fixtureManifest, fixtureUnit1, fixtureUnit2, fixtureWords } from '../fixtures/content.js';

type SyncHandler = (req: SyncRequest) => Response;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function stubFetch(onSync: SyncHandler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
      if (url === '/content/manifest.json') return json(fixtureManifest);
      if (url === '/content/words.json') return json(fixtureWords);
      if (url === '/content/units/l1-u01.json') return json(fixtureUnit1);
      if (url === '/content/units/l1-u02.json') return json(fixtureUnit2);
      if (url === '/api/sync') return onSync(JSON.parse(String(init?.body)) as SyncRequest);
      return new Response('not found', { status: 404 });
    }),
  );
}

function noSync(): Response {
  return json({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } } satisfies SyncResponse);
}

function renderApp(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(async () => {
  await db.delete();
  resetSyncStateForTests();
  await db.meta.put({ key: 'setupDone', value: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LessonFlow word-intro slide', () => {
  it('shows the word hanViet beside its pinyin', async () => {
    stubFetch(noSync);
    renderApp('/unit/l1-u01/lesson/0');

    // First lesson's first word is 我 (wǒ / Ngã).
    expect(await screen.findByText('wǒ')).toBeTruthy();
    expect(screen.getByText('Ngã')).toBeTruthy();
  });
});
