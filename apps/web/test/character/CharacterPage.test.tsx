// @vitest-environment jsdom
import type { CharacterData, SyncRequest, SyncResponse } from '@hi-chinese/content';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/db.js';
import { createAppRouter } from '../../src/router.js';
import { resetSyncStateForTests } from '../../src/sync/store.js';
import { fixtureCharacters, fixtureManifest, fixtureUnit1, fixtureUnit2, fixtureWords } from '../fixtures/content.js';

type SyncHandler = (req: SyncRequest) => Response;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const charByHex = new Map<string, CharacterData>(
  fixtureCharacters.map((c) => [c.character.codePointAt(0)!.toString(16), c]),
);

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
      const charMatch = /^\/content\/characters\/([0-9a-f]+)\.json$/.exec(url);
      if (charMatch) {
        const data = charByHex.get(charMatch[1]!);
        return data ? json(data) : new Response('not found', { status: 404 });
      }
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

describe('CharacterPage', () => {
  it('shows the character hanViet beside its pinyin', async () => {
    stubFetch(noSync);
    const hex = '我'.codePointAt(0)!.toString(16);
    renderApp(`/character/${hex}`);

    const heading = await screen.findByRole('heading', { name: '我' });
    const header = heading.closest('div')!;
    expect(header.textContent).toContain('wǒ');
    expect(header.textContent).toContain('Ngã');
  });
});

describe('CharacterPage associations', () => {
  it('shows the core gloss and the association list', async () => {
    stubFetch(noSync);
    renderApp('/character/6211');
    expect(await screen.findByText('tôi; ta')).toBeTruthy();
    const box = screen.getByRole('region', { name: 'Liên tưởng' });
    expect(within(box).getByText('我们')).toBeTruthy();
    expect(within(box).getByText('chúng tôi')).toBeTruthy();
  });
});
