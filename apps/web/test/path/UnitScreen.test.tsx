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

describe('UnitScreen', () => {
  it('renders lesson items with links into the lesson route', async () => {
    stubFetch(noSync);
    renderApp('/unit/l1-u01');

    expect(await screen.findByRole('heading', { name: 'Unit 1' })).toBeTruthy();
    expect(screen.getByText('6 words, 2 lessons')).toBeTruthy();

    const lesson0 = screen.getByTestId('lesson-0');
    const lesson1 = screen.getByTestId('lesson-1');
    expect(lesson0.dataset['done']).toBe('false');
    expect(lesson1.dataset['done']).toBe('false');

    const link0 = screen.getByRole('link', { name: /Lesson 1/ });
    expect(link0.getAttribute('href')).toBe('/unit/l1-u01/lesson/0');
    const link1 = screen.getByRole('link', { name: /Lesson 2/ });
    expect(link1.getAttribute('href')).toBe('/unit/l1-u01/lesson/1');
  });

  it('shows completed lessons as Done and the next lesson as Start', async () => {
    stubFetch(noSync);
    await db.unitProgress.put({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      completedLessons: [0],
      updatedAt: 100,
    });
    renderApp('/unit/l1-u01');

    const lesson0 = await screen.findByTestId('lesson-0');
    expect(lesson0.dataset['done']).toBe('true');
    expect(lesson0.textContent).toContain('Done');

    const lesson1 = screen.getByTestId('lesson-1');
    expect(lesson1.dataset['done']).toBe('false');
    expect(lesson1.textContent).toContain('Start');
  });

  it('marks the actual completed sub-lesson done, even when finished out of order', async () => {
    stubFetch(noSync);
    await db.unitProgress.put({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      completedLessons: [1],
      updatedAt: 100,
    });
    renderApp('/unit/l1-u01');

    const lesson0 = await screen.findByTestId('lesson-0');
    expect(lesson0.dataset['done']).toBe('false');
    expect(lesson0.textContent).toContain('Start');

    const lesson1 = screen.getByTestId('lesson-1');
    expect(lesson1.dataset['done']).toBe('true');
    expect(lesson1.textContent).toContain('Done');
  });

  it('explains a locked unit instead of listing its lessons', async () => {
    stubFetch(noSync);
    renderApp('/unit/l1-u02');

    expect(await screen.findByText(/locked/i)).toBeTruthy();
    expect(screen.queryByTestId('lesson-0')).toBeNull();
  });
});
