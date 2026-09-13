// @vitest-environment jsdom
import type { SyncRequest, SyncResponse } from '@hi-chinese/content';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/db/db.js';
import { createAppRouter } from '../src/router.js';
import { resetSyncStateForTests } from '../src/sync/store.js';
import { fixtureManifest, fixtureUnit1, fixtureUnit2, fixtureWords } from './fixtures/content.js';

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

function renderApp(path = '/') {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(async () => {
  await db.delete();
  resetSyncStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('app shell', () => {
  it('redirects a fresh device to setup, pulls progress after the passphrase, and shows the path', async () => {
    let seenAuth: string | null = null;
    stubFetch((req) => {
      expect(req.cursor).toBe(0);
      return json({
        cursor: 1,
        changes: {
          unitProgress: [
            {
              unitId: 'l1-u01',
              status: 'completed',
              completedAt: 100,
              completedLessons: [],
              updatedAt: 100,
            },
          ],
          cards: [],
          activity: [],
        },
      } satisfies SyncResponse);
    });
    const fetchMock = vi.mocked(fetch);
    renderApp('/');

    const input = await screen.findByLabelText('Passphrase');
    fireEvent.change(input, { target: { value: 'test-passphrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'HSK 1' })).toBeTruthy();
    expect(screen.getByTestId('unit-l1-u01').dataset['state']).toBe('completed');
    expect(screen.getByTestId('unit-l1-u02').dataset['state']).toBe('available');
    expect(screen.getByTestId('sync-status').textContent).toBe('Synced');

    const syncCall = fetchMock.mock.calls.find(([u]) => u === '/api/sync');
    seenAuth = new Headers(syncCall?.[1]?.headers).get('authorization');
    expect(seenAuth).toBe('Bearer test-passphrase');
    expect(await db.meta.get('setupDone')).toEqual({ key: 'setupDone', value: true });
  });

  it('rejects a wrong passphrase without offering to continue offline', async () => {
    stubFetch(() => json({ error: 'unauthorized' }, 401));
    renderApp('/');
    fireEvent.change(await screen.findByLabelText('Passphrase'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/rejected/i);
    expect(screen.queryByRole('button', { name: 'Continue offline' })).toBeNull();
    expect(await db.meta.get('setupDone')).toBeUndefined();
  });

  it('offers to continue offline when the server is unreachable', async () => {
    stubFetch(() => json({ error: 'internal error' }, 500));
    renderApp('/');
    fireEvent.change(await screen.findByLabelText('Passphrase'), {
      target: { value: 'test-passphrase' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue offline' }));
    expect(await screen.findByRole('heading', { name: 'HSK 1' })).toBeTruthy();
    expect(screen.getByTestId('unit-l1-u01').dataset['state']).toBe('available');
    expect(screen.getByTestId('unit-l1-u02').dataset['state']).toBe('locked');
  });

  it('shows the unit screen with a lesson picker for an available unit', async () => {
    stubFetch(() => json({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } }));
    await db.meta.put({ key: 'setupDone', value: true });
    renderApp('/unit/l1-u01');
    expect(await screen.findByRole('heading', { name: 'Unit 1' })).toBeTruthy();
    expect(screen.getByText('6 words, 2 lessons')).toBeTruthy();
    expect(screen.getByTestId('lesson-0')).toBeTruthy();
    expect(screen.getByTestId('lesson-1')).toBeTruthy();
  });

  it('explains a locked unit instead of offering its lessons', async () => {
    stubFetch(() => json({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } }));
    await db.meta.put({ key: 'setupDone', value: true });
    renderApp('/unit/l1-u02');
    expect(await screen.findByText(/locked/i)).toBeTruthy();
    expect(screen.queryByTestId('lesson-0')).toBeNull();
  });
});
