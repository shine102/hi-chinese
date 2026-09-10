# Phase 3: Web App Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web`, the installable React PWA: content loading from the static chunks, local-first progress in Dexie with a sync outbox talking to the Phase 2 Worker, the lesson path (locked / available / in progress / completed), the Learn step, a practice session with five generated exercise types, browser speech audio, passphrase setup, offline install, and the Worker serving the built app as static assets.

**Architecture:** The app is a Vite + React 19 SPA with TanStack Router (code-based routes). Content is read-only static JSON under `/content/` (built by `packages/content`, precached by the service worker). Progress lives in IndexedDB (Dexie) as the same row shapes the Worker stores; every local write also writes an `outbox` entry, and `syncOnce` pushes the outbox and pulls newer rows with last-write-wins on `updatedAt`. The exercise engine is pure TypeScript (`generateSession`, `sessionReducer`) with thin React components per exercise kind. Review scheduling, Hanzi Writer, character pages and streak display are Phase 4; this phase only creates the review-card rows when a unit is completed so Phase 4 has data to schedule.

**Tech Stack:** React 19.3, Vite 8.3 with `@vitejs/plugin-react` 6, Tailwind CSS 4.3 via `@tailwindcss/vite`, TanStack Router 1.170 (code-based), Dexie 4.4, `vite-plugin-pwa` 1.3 (Workbox 7, `registerType: 'prompt'`), `ts-fsrs` 5.4 (only `createEmptyCard` in this phase), Vitest 4.1 with `fake-indexeddb` and jsdom, Playwright 1.63 for one end-to-end test, Wrangler static assets (`run_worker_first: ["/api/*"]`).

**Spec:** `docs/superpowers/specs/2026-09-09-hi-chinese-design.md` (sections 2, 4 except "Write it", 7 client side, 8, 9). Roadmap and prior rulings: `docs/superpowers/plans/README.md` (read the findings list: LWW merge rule, activity counters, Vite proxy).

## Global Constraints

- Package manager pnpm 10 (binary on this machine: `~/.npm-global/node_modules/.bin/pnpm`; prefix shells with `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`). Never commit `package-lock.json`.
- Vitest pinned to `~4.1.11` everywhere, `typescript ~5.9.0`. New runtime dependencies of `apps/web` are exactly: `react`, `react-dom`, `@tanstack/react-router`, `dexie`, `ts-fsrs`, `workbox-window`, `@hi-chinese/content`. `packages/content` keeps zero runtime dependencies; the Worker's only runtime dependency stays `hono`.
- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (from `tsconfig.base.json`); `import type` for type-only imports; relative imports use the `.js` extension (also when the target is a `.tsx` file: `import { PathScreen } from './path/PathScreen.js'` — Vite and TypeScript both resolve it).
- Teaching language and all UI copy: English. No emoji in UI copy.
- Progress row shapes are the shared types in `packages/content/src/progress.ts` (`UnitProgressRow`, `CardRow`, `ActivityRow`, `SyncRequest`, `SyncResponse`, `cardId`). Timestamps are epoch milliseconds (integers). Every local write sets `updatedAt = max(now, previous.updatedAt + 1)` so the server's `excluded.updated_at > t.updated_at` rule accepts it.
- Sync: `POST /api/sync` with `Authorization: Bearer <passphrase>`, at most 500 rows per table per request, cursor = server sequence number from the last response (0 on first sync). Rows are merged locally with the same rule the server uses: a remote row replaces a local row only if `remote.updatedAt > local.updatedAt`. A pushed row missing from the response lost LWW and its outbox entry is still cleared (the server value arrives on the next pull; see roadmap). Sync 401 → status `unauthorized`, keep the outbox, re-prompt for the passphrase; 5xx or network → status `pending`/`offline`, keep the outbox, no user-facing error.
- The passphrase lives only in IndexedDB `meta` and the request header. It is never logged, never in a URL, never in the repo. Tests use only the literal `test-passphrase`.
- Content is fetched from `/content/...` (same origin). Chunk load failures retry once, then show an inline error with a Retry button. `/api/*` is never cached by the service worker.
- Never run `wrangler deploy`, `wrangler login`, or any `--remote` command. Never commit `.dev.vars`.
- Commit messages: conventional prefix (`feat:`, `test:`, `chore:`, `docs:`). Plain `git commit` with the user's global identity; no Co-Authored-By trailer.

## Verified facts (2026-09-10)

- Latest versions: `react`/`react-dom`/`@types/react`/`@types/react-dom` 19.3.0, `vite` 8.3.0, `@vitejs/plugin-react` 6.1.1 (peer `vite ^8`), `@tailwindcss/vite` and `tailwindcss` 4.3.3, `@tanstack/react-router` 1.170.34, `dexie` 4.4.5, `vite-plugin-pwa` 1.3.0 (peer `vite ^8`, `workbox-window ^7.4.1`; exports `./react` with types `react.d.ts` declaring `virtual:pwa-register/react` → `useRegisterSW()` returning `{ needRefresh: [boolean, setter], offlineReady, updateServiceWorker(reload?) }`), `ts-fsrs` 5.4.2 (`createEmptyCard(now?: Date)` → `Card { due: Date; stability; difficulty; elapsed_days; scheduled_days; learning_steps; reps; lapses; state: State; last_review?: Date }`, `State` enum New=0 Learning=1 Review=2 Relearning=3), `fake-indexeddb` 6.2.5, `jsdom` 30.0.1, `@testing-library/react` 16.3.3 (+ `@testing-library/dom` 10.4.1 peer), `@playwright/test` 1.63.0.
- TanStack Router exports used: `createRootRoute`, `createRoute`, `createRouter`, `RouterProvider`, `Outlet`, `Link`, `useNavigate`, `useParams`, `redirect`, `ErrorComponentProps`. Route params: `useParams({ from: '/unit/$unitId/learn' })`.
- Dexie 4 recommended TypeScript pattern: `const db = new Dexie(name) as Dexie & { table: Table<Row, Key> }` (class fields with `!` break under `useDefineForClassFields`, which ES2022 targets enable). `Table` methods used: `get`, `put`, `bulkGet` (returns `(T | undefined)[]`), `bulkPut`, `bulkDelete`, `delete`, `toArray`, `where(index).equals()`; `db.transaction('rw', [tables], fn)`; `liveQuery(fn).subscribe({ next, error })` is exported from `dexie`.
- The Cloudflare Vitest plugin ignores the `assets` block: with `assets` configured, `SELF.fetch('/')` still reaches the Worker and the existing 404 test keeps passing, and the assets directory does not need to exist for tests. `wrangler dev` does need the directory to exist.
- Wrangler `assets` keys: `directory`, `not_found_handling: "single-page-application"`, `run_worker_first: string[] | boolean`.
- Built content on disk: `apps/web/public/content/` = `manifest.json` (24 KB), `words.json` (690 KB, `Word[]`, 2209 entries), `units/<id>.json` (`UnitChunk`, ≤ 3 KB each, 184 files), `characters/<hex>.json` (`CharacterData`, ≤ 6 KB each, 899 files), 5.0 MB total. Unit ids: `l1-u01` … `l3-u79`. Unit 1 words: 的 了 我 是 你 在 不 有 他 这 就 个; it has 2 grammar points and 8 sentences.

## Rulings made while planning

- "Write it" exercise, strokes sheet, character page, review session, streak and due-count display are Phase 4. Phase 3 creates the `cards` rows (empty FSRS state) on unit completion so review data starts accruing now.
- Fresh device: after the passphrase is accepted the app pulls before showing the path (spec §7). If the server is unreachable during setup, the user may choose "Continue offline"; the pull happens at the next sync trigger. A wrong passphrase (401) never offers that shortcut.
- Match-pairs counts as correct only with zero mismatches; any mismatch re-queues the exercise like other wrong answers.
- When no Chinese voice is available, listen-and-pick exercises are not generated (they would be unanswerable); the session fills with multiple choice instead.
- Exercise components render dev-only `data-correct` / `data-answer-index` / `data-pair-*` attributes (guarded by `import.meta.env.DEV`) so the end-to-end test can solve exercises without re-implementing the engine. Production builds carry none of them.
- The end-to-end test runs against the Vite dev server proxying to `wrangler dev` with a throw-away local D1 (`--persist-to .wrangler/e2e`). Serving the built app through the Worker's assets binding is verified by hand (`pnpm build && pnpm worker:dev`, open http://127.0.0.1:8787) because the Vitest plugin does not exercise assets.

## File structure

```
apps/web/package.json                     @hi-chinese/web: dev, build, preview, test, typecheck, icons, e2e
apps/web/index.html
apps/web/vite.config.ts                   react, tailwind, VitePWA, server.proxy /api → 127.0.0.1:8787
apps/web/vitest.config.ts                 react plugin, fake-indexeddb setup, alias for virtual:pwa-register/react
apps/web/tsconfig.json                    DOM lib, react-jsx, vite/client + vite-plugin-pwa/react types
apps/web/playwright.config.ts
apps/web/scripts/make-icons.mjs           writes public/icons/icon-192.png, icon-512.png (zlib PNG encoder, no deps)
apps/web/public/icons/icon-192.png, icon-512.png
apps/web/src/main.tsx                     mount RouterProvider, install sync triggers
apps/web/src/app.css                      @import "tailwindcss"
apps/web/src/router.tsx                   routes: /, /setup, /settings, /unit/$unitId, /unit/$unitId/learn, /unit/$unitId/practice
apps/web/src/content/loader.ts            fetchJson (retry once), loadManifest/loadWords/loadUnit/loadCharacter
apps/web/src/content/index.ts             ContentIndex, buildContentIndex
apps/web/src/content/provider.tsx         ContentProvider, ContentGate, useContent, useUnitChunk
apps/web/src/db/db.ts                     openDb(): HiChineseDb (Dexie tables unitProgress, cards, activity, outbox, meta), outboxKey
apps/web/src/db/meta.ts                   getMeta/setMeta, getPassphrase, getCursor, isSetupDone
apps/web/src/db/time.ts                   nextUpdatedAt, localDate
apps/web/src/db/progress.ts               markUnitStarted, completeUnit
apps/web/src/db/use-live-query.ts         useLiveQuery hook over dexie liveQuery
apps/web/src/fsrs/state.ts                toFsrsState, fromFsrsState, emptyFsrsState
apps/web/src/sync/merge.ts                pickWinners (pure LWW)
apps/web/src/sync/outbox.ts               collectOutbox, ackOutbox
apps/web/src/sync/apply.ts                applyRemoteChanges
apps/web/src/sync/client.ts               syncOnce
apps/web/src/sync/store.ts                sync status store: getSyncState, subscribeSync, useSyncState, requestSync
apps/web/src/sync/triggers.ts             installSyncTriggers (app start, online event)
apps/web/src/path/unlock.ts               computeUnitStates
apps/web/src/path/PathScreen.tsx
apps/web/src/path/UnitScreen.tsx
apps/web/src/setup/SetupScreen.tsx
apps/web/src/settings/SettingsScreen.tsx
apps/web/src/audio/speech.ts              chineseVoice, getChineseVoice, speak, subscribeVoices, useHasChineseVoice
apps/web/src/audio/SpeakButton.tsx        SpeakButton, NoVoiceBanner
apps/web/src/learn/LearnScreen.tsx        WordCard, GrammarCard, LearnScreen
apps/web/src/exercises/random.ts          mulberry32, shuffle, pick, randomInt
apps/web/src/exercises/types.ts           Exercise union, Answer, checkAnswer, correctAnswerText
apps/web/src/exercises/generate.ts        generateSession, SESSION_SIZE, primaryMeaning, tokensOf
apps/web/src/exercises/session.ts         createSession, sessionReducer, currentExercise, sessionProgress, accuracy
apps/web/src/exercises/dev-attrs.ts       devAttr helper (DEV-only data attributes)
apps/web/src/exercises/components/MultipleChoice.tsx, ListenPick.tsx, MatchPairs.tsx, SentenceBuilder.tsx, FillBlank.tsx, ExerciseView.tsx, ExerciseBoundary.tsx
apps/web/src/practice/PracticeScreen.tsx  session runner, feedback, results
apps/web/src/ui/AppShell.tsx              Header + UpdateToast + ContentProvider/ContentGate + Outlet
apps/web/src/ui/Header.tsx                title, SyncIndicator, settings link
apps/web/src/ui/UpdateToast.tsx           useRegisterSW prompt
apps/web/src/ui/RouteError.tsx            route error + not found components
apps/web/src/ui/Loading.tsx, InlineError.tsx
apps/web/test/setup.ts                    import 'fake-indexeddb/auto'
apps/web/test/stubs/pwa-register.ts       useRegisterSW stub
apps/web/test/**/*.test.ts(x)
apps/web/e2e/complete-unit.spec.ts
apps/worker/wrangler.jsonc                assets block
apps/worker/package.json                  predev creates ../web/dist
package.json                              dev, build, web:dev, web:test, e2e scripts
.gitignore, .prettierignore               dev-dist, test-results, playwright-report
README.md, docs/superpowers/plans/README.md
```

---

### Task 1: Web app scaffold (Vite, React, Tailwind, PWA, icons, test harness)

**Files:**
- Create: `apps/web/package.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/tsconfig.json`, `apps/web/scripts/make-icons.mjs`, `apps/web/public/icons/icon-192.png`, `apps/web/public/icons/icon-512.png`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/app.css`, `apps/web/test/setup.ts`, `apps/web/test/stubs/pwa-register.ts`, `apps/web/test/app.test.tsx`
- Modify: `package.json` (root scripts), `.gitignore`, `.prettierignore`

**Interfaces:**
- Produces: the `@hi-chinese/web` package every later task adds files to; `pnpm -F @hi-chinese/web test|typecheck|build|dev` all work. Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock; IndexedDB tests rely on `test/setup.ts`.

- [ ] **Step 1: Create the package**

`apps/web/package.json`:

```json
{
  "name": "@hi-chinese/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "icons": "node scripts/make-icons.mjs",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@hi-chinese/content": "workspace:*",
    "@tanstack/react-router": "^1.170.34",
    "dexie": "^4.4.5",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "ts-fsrs": "^5.4.2",
    "workbox-window": "^7.4.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.3.3",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^30.0.1",
    "tailwindcss": "^4.3.3",
    "typescript": "~5.9.0",
    "vite": "^8.3.0",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "~4.1.11"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "vite-plugin-pwa/react"],
    "noEmit": true
  },
  "include": ["src", "test", "e2e", "playwright.config.ts"]
}
```

(`e2e` and `playwright.config.ts` do not exist until Task 12; `include` entries that match nothing are fine.)

`apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#b91c1c" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Hi Chinese</title>
  </head>
  <body class="bg-stone-50 text-stone-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Hi Chinese',
        short_name: 'Hi Chinese',
        description: 'Learn Mandarin Chinese, HSK 1 to 3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#b91c1c',
        background_color: '#fafaf9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and every content chunk (about 5 MB) so the
        // whole course works offline after install. Content files change name
        // only when the content build changes them; Workbox revisions handle
        // invalidation.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // /api is live data handled by the sync outbox; never serve it from cache
        // or fall back to index.html for it.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // The Worker has no CORS handling by design; in dev, Vite proxies API calls
    // to `wrangler dev`.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
```

`apps/web/vitest.config.ts`:

```ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The PWA virtual module only exists inside the Vite PWA plugin; tests use a stub.
      'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'test/stubs/pwa-register.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
  },
});
```

`apps/web/test/setup.ts`:

```ts
// Gives Dexie a working indexedDB/IDBKeyRange in Node and jsdom test environments.
import 'fake-indexeddb/auto';
```

`apps/web/test/stubs/pwa-register.ts`:

```ts
import { useState } from 'react';

export function useRegisterSW() {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: async () => {} };
}
```

`apps/web/src/app.css`:

```css
@import 'tailwindcss';
```

`apps/web/src/App.tsx` (placeholder; Task 5 replaces `main.tsx` with the router and deletes this file):

```tsx
export function App() {
  return <h1 className="p-4 text-2xl font-semibold">Hi Chinese</h1>;
}
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './app.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root element');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Icon generator**

`apps/web/scripts/make-icons.mjs` (plain Node, no dependencies; writes valid 8-bit RGB PNGs):

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      const o = y * stride + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Red ground with a white disc: legible at every size and safe for maskable icons.
function pixel(x, y, size) {
  const c = size / 2;
  const r = size * 0.28;
  const inside = (x - c) ** 2 + (y - c) ** 2 <= r * r;
  return inside ? [255, 255, 255] : [185, 28, 28];
}

mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), png(size, pixel));
}
console.log(`wrote icons to ${outDir}`);
```

Run: `pnpm -F @hi-chinese/web icons` (after Step 4 installs). Expected: two PNG files; `file apps/web/public/icons/icon-192.png` reports `PNG image data, 192 x 192, 8-bit/color RGB`.

- [ ] **Step 3: Root scripts and ignores**

Add to root `package.json` `scripts` (keep existing ones):

```json
"dev": "pnpm -r --parallel --if-present dev",
"build": "pnpm content:build && pnpm -F @hi-chinese/web build",
"web:dev": "pnpm -F @hi-chinese/web dev",
"web:test": "pnpm -F @hi-chinese/web test",
"e2e": "pnpm -F @hi-chinese/web e2e"
```

Append to `.gitignore`:

```
apps/web/dev-dist/
apps/web/test-results/
apps/web/playwright-report/
```

Append to `.prettierignore`:

```
apps/web/dev-dist/
apps/web/test-results/
apps/web/playwright-report/
```

- [ ] **Step 4: Install and write the smoke test**

Run: `pnpm install` (from the repo root). Expected: lockfile updated, no peer warnings for vite/react.

`apps/web/test/app.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App.js';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Hi Chinese' })).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run test, typecheck, build**

Run: `pnpm -F @hi-chinese/web test` — Expected: 1 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: no errors.
Run: `pnpm -F @hi-chinese/web build` — Expected: `dist/index.html`, `dist/sw.js`, `dist/manifest.webmanifest` exist and the Workbox summary lists the precached entries (about 1,090 entries when `public/content` is built; if `public/content` is missing run `pnpm content:build` first — it needs `pnpm content:fetch` once).
Run: `pnpm format:check` — Expected: clean (run `pnpm format` if not).

- [ ] **Step 6: Commit**

```bash
git add apps/web package.json pnpm-lock.yaml .gitignore .prettierignore
git commit -m "feat(web): scaffold Vite + React PWA app with test harness"
```

---

### Task 2: Content loader and index

**Files:**
- Create: `apps/web/src/content/loader.ts`, `apps/web/src/content/index.ts`
- Test: `apps/web/test/content/loader.test.ts`, `apps/web/test/content/index.test.ts`

**Interfaces:**
- Consumes: `ContentManifest`, `Word`, `UnitChunk`, `CharacterData`, `ManifestUnit`, `HskLevel`, `characterFileName` from `@hi-chinese/content`.
- Produces:

```ts
export class ContentLoadError extends Error { readonly url: string }
export type FetchLike = (url: string) => Promise<Response>;
export function fetchJson<T>(url: string, fetchImpl?: FetchLike): Promise<T>;   // one retry, then throws
export const CONTENT_BASE = '/content';
export function loadManifest(fetchImpl?: FetchLike): Promise<ContentManifest>;
export function loadWords(fetchImpl?: FetchLike): Promise<Word[]>;
export function loadUnit(unitId: string, fetchImpl?: FetchLike): Promise<UnitChunk>;
export function loadCharacter(ch: string, fetchImpl?: FetchLike): Promise<CharacterData>;

export interface ContentIndex {
  manifest: ContentManifest;
  words: ReadonlyMap<string, Word>;                       // by word id
  unitOrder: readonly string[];                           // every unit id, level 1 first, in path order
  unitById: ReadonlyMap<string, ManifestUnit>;
  wordIdsByLevel: ReadonlyMap<HskLevel, readonly string[]>;
}
export function buildContentIndex(manifest: ContentManifest, words: readonly Word[]): ContentIndex;
```

- [ ] **Step 1: Write the failing tests**

`apps/web/test/content/loader.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ContentLoadError, fetchJson, loadCharacter, loadUnit } from '../../src/content/loader.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    await expect(fetchJson<{ ok: number }>('/x.json', fetchImpl)).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once after a failure and then succeeds', async () => {
    const fetchImpl = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: 2 }));
    await expect(fetchJson('/x.json', fetchImpl)).resolves.toEqual({ ok: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws a ContentLoadError with the url after two failures', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 404));
    const err = await fetchJson('/missing.json', fetchImpl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContentLoadError);
    expect((err as ContentLoadError).url).toBe('/missing.json');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates network errors after the retry', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchJson('/x.json', fetchImpl)).rejects.toThrow('Failed to fetch');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('content urls', () => {
  it('loads units and characters from the content directory', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return jsonResponse({});
    };
    await loadUnit('l1-u01', fetchImpl);
    await loadCharacter('我', fetchImpl);
    expect(urls).toEqual(['/content/units/l1-u01.json', '/content/characters/6211.json']);
  });
});
```

`apps/web/test/content/index.test.ts`:

```ts
import type { ContentManifest, Word } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../src/content/index.js';

function word(simplified: string, level: 1 | 2 | 3, unitId: string): Word {
  return {
    id: `w:${simplified}`,
    simplified,
    traditional: simplified,
    pinyin: 'x',
    pinyinNumeric: 'x1',
    meanings: ['meaning'],
    alternates: [],
    pos: [],
    classifiers: [],
    level,
    frequency: 1,
    characters: [...simplified],
    unitId,
  };
}

const manifest: ContentManifest = {
  version: 'v1',
  generatedAt: '2026-09-10T00:00:00.000Z',
  levels: [
    { level: 1, title: 'HSK 1', unitIds: ['l1-u01', 'l1-u02'] },
    { level: 2, title: 'HSK 2', unitIds: ['l2-u01'] },
  ],
  units: [
    { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 1, grammarCount: 0 },
    { id: 'l1-u02', level: 1, order: 2, title: 'Unit 2', wordCount: 1, grammarCount: 0 },
    { id: 'l2-u01', level: 2, order: 3, title: 'Unit 3', wordCount: 1, grammarCount: 0 },
  ],
  characters: [],
  counts: { words: 3, characters: 0, grammar: 0, sentences: 0, units: 3 },
};

describe('buildContentIndex', () => {
  const index = buildContentIndex(manifest, [
    word('我', 1, 'l1-u01'),
    word('你', 1, 'l1-u02'),
    word('朋友', 2, 'l2-u01'),
  ]);

  it('orders units level by level in path order', () => {
    expect(index.unitOrder).toEqual(['l1-u01', 'l1-u02', 'l2-u01']);
    expect(index.unitById.get('l2-u01')?.title).toBe('Unit 3');
  });

  it('indexes words by id and by level', () => {
    expect(index.words.get('w:我')?.simplified).toBe('我');
    expect(index.wordIdsByLevel.get(1)).toEqual(['w:我', 'w:你']);
    expect(index.wordIdsByLevel.get(2)).toEqual(['w:朋友']);
    expect(index.wordIdsByLevel.get(3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- content`
Expected: FAIL, cannot find `../../src/content/loader.js` / `index.js`.

- [ ] **Step 3: Implement**

`apps/web/src/content/loader.ts`:

```ts
import type { CharacterData, ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import { characterFileName } from '@hi-chinese/content';

export class ContentLoadError extends Error {
  readonly url: string;
  constructor(url: string, message: string) {
    super(`${message} (${url})`);
    this.name = 'ContentLoadError';
    this.url = url;
  }
}

export type FetchLike = (url: string) => Promise<Response>;

const defaultFetch: FetchLike = (url) => fetch(url);

/** Fetches JSON, retrying once on any failure (spec §8: retry once, then surface the error). */
export async function fetchJson<T>(url: string, fetchImpl: FetchLike = defaultFetch): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) throw new ContentLoadError(url, `HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new ContentLoadError(url, String(lastError));
}

export const CONTENT_BASE = '/content';

export function loadManifest(fetchImpl?: FetchLike): Promise<ContentManifest> {
  return fetchJson<ContentManifest>(`${CONTENT_BASE}/manifest.json`, fetchImpl);
}

export function loadWords(fetchImpl?: FetchLike): Promise<Word[]> {
  return fetchJson<Word[]>(`${CONTENT_BASE}/words.json`, fetchImpl);
}

export function loadUnit(unitId: string, fetchImpl?: FetchLike): Promise<UnitChunk> {
  return fetchJson<UnitChunk>(`${CONTENT_BASE}/units/${unitId}.json`, fetchImpl);
}

export function loadCharacter(ch: string, fetchImpl?: FetchLike): Promise<CharacterData> {
  return fetchJson<CharacterData>(
    `${CONTENT_BASE}/characters/${characterFileName(ch)}.json`,
    fetchImpl,
  );
}
```

`apps/web/src/content/index.ts`:

```ts
import type { ContentManifest, HskLevel, ManifestUnit, Word } from '@hi-chinese/content';

export interface ContentIndex {
  manifest: ContentManifest;
  words: ReadonlyMap<string, Word>;
  /** Every unit id in path order: all of level 1, then level 2, then level 3. */
  unitOrder: readonly string[];
  unitById: ReadonlyMap<string, ManifestUnit>;
  wordIdsByLevel: ReadonlyMap<HskLevel, readonly string[]>;
}

export function buildContentIndex(manifest: ContentManifest, words: readonly Word[]): ContentIndex {
  const wordMap = new Map<string, Word>();
  const byLevel = new Map<HskLevel, string[]>([
    [1, []],
    [2, []],
    [3, []],
  ]);
  for (const w of words) {
    wordMap.set(w.id, w);
    byLevel.get(w.level)?.push(w.id);
  }
  return {
    manifest,
    words: wordMap,
    unitOrder: manifest.levels.flatMap((l) => l.unitIds),
    unitById: new Map(manifest.units.map((u) => [u.id, u])),
    wordIdsByLevel: byLevel,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- content` — Expected: 7 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content apps/web/test/content
git commit -m "feat(web): content loader with single retry and content index"
```

---

### Task 3: Dexie database, meta, timestamps, FSRS state conversion, progress writes

**Files:**
- Create: `apps/web/src/db/db.ts`, `apps/web/src/db/meta.ts`, `apps/web/src/db/time.ts`, `apps/web/src/fsrs/state.ts`, `apps/web/src/db/progress.ts`
- Test: `apps/web/test/db/time.test.ts`, `apps/web/test/fsrs/state.test.ts`, `apps/web/test/db/progress.test.ts`

**Interfaces:**
- Consumes: `UnitProgressRow`, `CardRow`, `ActivityRow`, `CardKind`, `FsrsState`, `cardId` from `@hi-chinese/content`; `createEmptyCard`, `Card`, `State` from `ts-fsrs`.
- Produces:

```ts
// db.ts
export type OutboxTable = 'unitProgress' | 'cards' | 'activity';
export interface OutboxRow { key: string; table: OutboxTable; rowKey: string; updatedAt: number }
export type MetaKey = 'passphrase' | 'cursor' | 'contentVersion' | 'setupDone';
export interface MetaRow { key: MetaKey; value: string | number | boolean }
export type HiChineseDb = Dexie & {
  unitProgress: Table<UnitProgressRow, string>;
  cards: Table<CardRow, string>;
  activity: Table<ActivityRow, string>;
  outbox: Table<OutboxRow, string>;
  meta: Table<MetaRow, MetaKey>;
};
export function openDb(name?: string): HiChineseDb;          // default name 'hi-chinese'
export function outboxKey(table: OutboxTable, rowKey: string): string;   // `${table}:${rowKey}`
export function outboxEntry(table: OutboxTable, rowKey: string, updatedAt: number): OutboxRow;
export const db: HiChineseDb;                                   // the app's singleton

// meta.ts
export function getMeta<T extends string | number | boolean>(db: HiChineseDb, key: MetaKey): Promise<T | undefined>;
export function setMeta(db: HiChineseDb, key: MetaKey, value: string | number | boolean): Promise<void>;
export function getPassphrase(db: HiChineseDb): Promise<string | undefined>;
export function getCursor(db: HiChineseDb): Promise<number>;    // 0 when unset
export function isSetupDone(db: HiChineseDb): Promise<boolean>;

// time.ts
export function nextUpdatedAt(prev: number | undefined, now: number): number;   // max(now, prev + 1)
export function localDate(now: number): string;                                  // YYYY-MM-DD, local time

// fsrs/state.ts
export function toFsrsState(card: Card): FsrsState;
export function fromFsrsState(state: FsrsState): Card;
export function emptyFsrsState(now: number): FsrsState;

// progress.ts
export function markUnitStarted(db: HiChineseDb, unitId: string, now: number): Promise<void>;
export interface CompleteUnitInput { unitId: string; wordIds: readonly string[]; characters: readonly string[]; now: number }
export function completeUnit(db: HiChineseDb, input: CompleteUnitInput): Promise<void>;
```

- [ ] **Step 1: Write the failing tests**

`apps/web/test/db/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localDate, nextUpdatedAt } from '../../src/db/time.js';

describe('nextUpdatedAt', () => {
  it('uses now when there is no previous value', () => {
    expect(nextUpdatedAt(undefined, 1000)).toBe(1000);
  });
  it('is strictly greater than the previous value even when the clock went backwards', () => {
    expect(nextUpdatedAt(5000, 1000)).toBe(5001);
    expect(nextUpdatedAt(1000, 1000)).toBe(1001);
    expect(nextUpdatedAt(1000, 2000)).toBe(2000);
  });
});

describe('localDate', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    const d = new Date(2026, 8, 5, 23, 59); // 5 September 2026, local time
    expect(localDate(d.getTime())).toBe('2026-09-05');
  });
});
```

`apps/web/test/fsrs/state.test.ts`:

```ts
import { createEmptyCard } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { emptyFsrsState, fromFsrsState, toFsrsState } from '../../src/fsrs/state.js';

describe('FSRS state conversion', () => {
  it('creates an empty card due now in state New with no last review', () => {
    const now = Date.UTC(2026, 8, 10, 12, 0, 0);
    expect(emptyFsrsState(now)).toEqual({
      due: now,
      stability: 0,
      difficulty: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
    });
  });

  it('round-trips through ts-fsrs Card', () => {
    const now = new Date(Date.UTC(2026, 8, 10));
    const card = { ...createEmptyCard(now), reps: 3, lapses: 1, last_review: now, state: 2 as const };
    const state = toFsrsState(card);
    expect(state.lastReview).toBe(now.getTime());
    const back = fromFsrsState(state);
    expect(back.due.getTime()).toBe(card.due.getTime());
    expect(back.last_review?.getTime()).toBe(now.getTime());
    expect(back.reps).toBe(3);
    expect(back.lapses).toBe(1);
    expect(back.state).toBe(2);
    expect(toFsrsState(back)).toEqual(state);
  });
});
```

`apps/web/test/db/progress.test.ts`:

```ts
import { cardId } from '@hi-chinese/content';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, outboxKey, type HiChineseDb } from '../../src/db/db.js';
import { getCursor, getMeta, isSetupDone, setMeta } from '../../src/db/meta.js';
import { completeUnit, markUnitStarted } from '../../src/db/progress.js';
import { localDate } from '../../src/db/time.js';

let db: HiChineseDb;
beforeEach(() => {
  db = openDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

describe('meta', () => {
  it('reads defaults and round-trips values', async () => {
    expect(await getCursor(db)).toBe(0);
    expect(await isSetupDone(db)).toBe(false);
    await setMeta(db, 'cursor', 42);
    await setMeta(db, 'setupDone', true);
    await setMeta(db, 'passphrase', 'test-passphrase');
    expect(await getCursor(db)).toBe(42);
    expect(await isSetupDone(db)).toBe(true);
    expect(await getMeta<string>(db, 'passphrase')).toBe('test-passphrase');
  });
});

describe('markUnitStarted', () => {
  it('creates an in-progress row and an outbox entry once', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    await markUnitStarted(db, 'l1-u01', 2000);
    expect(await db.unitProgress.get('l1-u01')).toEqual({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      updatedAt: 1000,
    });
    expect(await db.outbox.toArray()).toEqual([
      { key: 'unitProgress:l1-u01', table: 'unitProgress', rowKey: 'l1-u01', updatedAt: 1000 },
    ]);
  });
});

describe('completeUnit', () => {
  const input = { unitId: 'l1-u01', wordIds: ['w:我', 'w:你们'], characters: ['我', '你', '们'], now: 5000 };

  it('marks the unit completed with a monotonic updatedAt', async () => {
    await markUnitStarted(db, 'l1-u01', 9000); // clock was ahead earlier
    await completeUnit(db, input);
    expect(await db.unitProgress.get('l1-u01')).toEqual({
      unitId: 'l1-u01',
      status: 'completed',
      completedAt: 5000,
      updatedAt: 9001,
    });
    expect(await db.outbox.get(outboxKey('unitProgress', 'l1-u01'))).toMatchObject({ updatedAt: 9001 });
  });

  it('creates two cards per word and one per character with empty FSRS state', async () => {
    await completeUnit(db, input);
    const cards = await db.cards.toArray();
    expect(cards.map((c) => c.cardId).sort()).toEqual(
      [
        cardId('word-recognition', 'w:我'),
        cardId('word-recall', 'w:我'),
        cardId('word-recognition', 'w:你们'),
        cardId('word-recall', 'w:你们'),
        cardId('char-write', '我'),
        cardId('char-write', '你'),
        cardId('char-write', '们'),
      ].sort(),
    );
    const one = cards.find((c) => c.cardId === cardId('char-write', '们'));
    expect(one).toMatchObject({ kind: 'char-write', updatedAt: 5000 });
    expect(one?.fsrs).toMatchObject({ due: 5000, state: 0, reps: 0, lastReview: null });
    const outboxKeys = (await db.outbox.toArray()).map((o) => o.key).sort();
    expect(outboxKeys).toHaveLength(1 + 7 + 1); // unit + cards + activity
  });

  it('does not overwrite cards that already exist', async () => {
    await completeUnit(db, input);
    const before = await db.cards.get(cardId('word-recall', 'w:我'));
    await db.cards.put({ ...before!, fsrs: { ...before!.fsrs, reps: 9 }, updatedAt: 7000 });
    await db.outbox.clear();
    await completeUnit(db, { ...input, now: 8000 });
    const after = await db.cards.get(cardId('word-recall', 'w:我'));
    expect(after?.fsrs.reps).toBe(9);
    expect(after?.updatedAt).toBe(7000);
    const outbox = await db.outbox.toArray();
    expect(outbox.map((o) => o.table).sort()).toEqual(['activity', 'unitProgress']);
  });

  it('increments today\'s lesson counter', async () => {
    await completeUnit(db, input);
    await completeUnit(db, { ...input, unitId: 'l1-u02', now: 6000 });
    const date = localDate(6000);
    expect(await db.activity.get(date)).toEqual({ date, lessons: 2, reviews: 0, updatedAt: 6000 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- db fsrs`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/db/db.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { ActivityRow, CardRow, UnitProgressRow } from '@hi-chinese/content';

export type OutboxTable = 'unitProgress' | 'cards' | 'activity';

/** A local row change waiting to be pushed. `updatedAt` is the row's updatedAt at write time. */
export interface OutboxRow {
  key: string;
  table: OutboxTable;
  rowKey: string;
  updatedAt: number;
}

export type MetaKey = 'passphrase' | 'cursor' | 'contentVersion' | 'setupDone';

export interface MetaRow {
  key: MetaKey;
  value: string | number | boolean;
}

export type HiChineseDb = Dexie & {
  unitProgress: Table<UnitProgressRow, string>;
  cards: Table<CardRow, string>;
  activity: Table<ActivityRow, string>;
  outbox: Table<OutboxRow, string>;
  meta: Table<MetaRow, MetaKey>;
};

export function openDb(name = 'hi-chinese'): HiChineseDb {
  const d = new Dexie(name) as HiChineseDb;
  d.version(1).stores({
    unitProgress: 'unitId, status',
    cards: 'cardId, kind, fsrs.due',
    activity: 'date',
    outbox: 'key, table',
    meta: 'key',
  });
  return d;
}

export function outboxKey(table: OutboxTable, rowKey: string): string {
  return `${table}:${rowKey}`;
}

export function outboxEntry(table: OutboxTable, rowKey: string, updatedAt: number): OutboxRow {
  return { key: outboxKey(table, rowKey), table, rowKey, updatedAt };
}

export const db: HiChineseDb = openDb();
```

`apps/web/src/db/meta.ts`:

```ts
import type { HiChineseDb, MetaKey } from './db.js';

export async function getMeta<T extends string | number | boolean>(
  db: HiChineseDb,
  key: MetaKey,
): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row === undefined ? undefined : (row.value as T);
}

export async function setMeta(
  db: HiChineseDb,
  key: MetaKey,
  value: string | number | boolean,
): Promise<void> {
  await db.meta.put({ key, value });
}

export function getPassphrase(db: HiChineseDb): Promise<string | undefined> {
  return getMeta<string>(db, 'passphrase');
}

export async function getCursor(db: HiChineseDb): Promise<number> {
  return (await getMeta<number>(db, 'cursor')) ?? 0;
}

export async function isSetupDone(db: HiChineseDb): Promise<boolean> {
  return (await getMeta<boolean>(db, 'setupDone')) === true;
}
```

`apps/web/src/db/time.ts`:

```ts
/**
 * Next `updatedAt` for a row: never earlier than now, and always strictly after
 * the previous value so the server's last-write-wins compare accepts the write
 * even if the device clock moved backwards.
 */
export function nextUpdatedAt(prev: number | undefined, now: number): number {
  return prev === undefined ? now : Math.max(now, prev + 1);
}

/** Calendar day in the learner's local time zone, formatted YYYY-MM-DD. */
export function localDate(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
```

`apps/web/src/fsrs/state.ts`:

```ts
import type { FsrsState } from '@hi-chinese/content';
import { createEmptyCard, type Card, type State } from 'ts-fsrs';

export function toFsrsState(card: Card): FsrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

export function fromFsrsState(state: FsrsState): Card {
  const card: Card = {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    // Deprecated in ts-fsrs 5 and not persisted; the scheduler derives elapsed time from last_review.
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
  };
  if (state.lastReview !== null) card.last_review = new Date(state.lastReview);
  return card;
}

export function emptyFsrsState(now: number): FsrsState {
  return toFsrsState(createEmptyCard(new Date(now)));
}
```

`apps/web/src/db/progress.ts`:

```ts
import { cardId, type CardKind, type CardRow } from '@hi-chinese/content';
import { emptyFsrsState } from '../fsrs/state.js';
import { outboxEntry, type HiChineseDb, type OutboxRow } from './db.js';
import { localDate, nextUpdatedAt } from './time.js';

/** Records that the learner opened a unit. No-op if the unit already has a row. */
export async function markUnitStarted(db: HiChineseDb, unitId: string, now: number): Promise<void> {
  await db.transaction('rw', [db.unitProgress, db.outbox], async () => {
    if ((await db.unitProgress.get(unitId)) !== undefined) return;
    const updatedAt = nextUpdatedAt(undefined, now);
    await db.unitProgress.put({ unitId, status: 'in-progress', completedAt: null, updatedAt });
    await db.outbox.put(outboxEntry('unitProgress', unitId, updatedAt));
  });
}

export interface CompleteUnitInput {
  unitId: string;
  wordIds: readonly string[];
  characters: readonly string[];
  now: number;
}

/**
 * Marks the unit completed, creates review cards for its words and characters
 * (only those that do not exist yet), counts a lesson for today, and queues every
 * written row in the outbox. One transaction: either all of it lands or none.
 */
export async function completeUnit(db: HiChineseDb, input: CompleteUnitInput): Promise<void> {
  const { unitId, now } = input;
  await db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    const prev = await db.unitProgress.get(unitId);
    const unitUpdatedAt = nextUpdatedAt(prev?.updatedAt, now);
    await db.unitProgress.put({ unitId, status: 'completed', completedAt: now, updatedAt: unitUpdatedAt });
    outbox.push(outboxEntry('unitProgress', unitId, unitUpdatedAt));

    const wanted: { id: string; kind: CardKind }[] = [];
    for (const w of input.wordIds) {
      wanted.push({ id: cardId('word-recognition', w), kind: 'word-recognition' });
      wanted.push({ id: cardId('word-recall', w), kind: 'word-recall' });
    }
    for (const ch of input.characters) wanted.push({ id: cardId('char-write', ch), kind: 'char-write' });
    const existing = await db.cards.bulkGet(wanted.map((c) => c.id));
    const fresh: CardRow[] = [];
    wanted.forEach((c, i) => {
      if (existing[i] !== undefined) return;
      fresh.push({ cardId: c.id, kind: c.kind, fsrs: emptyFsrsState(now), updatedAt: now });
      outbox.push(outboxEntry('cards', c.id, now));
    });
    if (fresh.length > 0) await db.cards.bulkPut(fresh);

    const date = localDate(now);
    const day = await db.activity.get(date);
    const dayUpdatedAt = nextUpdatedAt(day?.updatedAt, now);
    await db.activity.put({
      date,
      lessons: (day?.lessons ?? 0) + 1,
      reviews: day?.reviews ?? 0,
      updatedAt: dayUpdatedAt,
    });
    outbox.push(outboxEntry('activity', date, dayUpdatedAt));

    await db.outbox.bulkPut(outbox);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- db fsrs` — Expected: 10 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/db apps/web/src/fsrs apps/web/test/db apps/web/test/fsrs
git commit -m "feat(web): Dexie progress store with outbox and review-card creation"
```

---

### Task 4: Sync client (merge, outbox, apply, request loop, status store, triggers)

**Files:**
- Create: `apps/web/src/sync/merge.ts`, `apps/web/src/sync/outbox.ts`, `apps/web/src/sync/apply.ts`, `apps/web/src/sync/client.ts`, `apps/web/src/sync/store.ts`, `apps/web/src/sync/triggers.ts`
- Test: `apps/web/test/sync/merge.test.ts`, `apps/web/test/sync/client.test.ts`

**Interfaces:**
- Consumes: `HiChineseDb`, `OutboxRow`, `OutboxTable`, `outboxKey` (Task 3), `getPassphrase`, `getCursor`, `setMeta` (Task 3); `SyncChanges`, `SyncRequest`, `SyncResponse`, `emptyChanges` from `@hi-chinese/content`.
- Produces:

```ts
// merge.ts
export function pickWinners<T extends { updatedAt: number }>(remote: readonly T[], local: ReadonlyMap<string, T>, keyOf: (row: T) => string): T[];

// outbox.ts
export const MAX_ROWS_PER_TABLE = 500;
export interface OutboxBatch { changes: SyncChanges; entries: OutboxRow[]; remaining: number }
export function collectOutbox(db: HiChineseDb): Promise<OutboxBatch>;
export function ackOutbox(db: HiChineseDb, entries: readonly OutboxRow[]): Promise<void>;

// apply.ts
export function applyRemoteChanges(db: HiChineseDb, changes: SyncChanges): Promise<number>;   // rows written

// client.ts
export type SyncOutcome = 'synced' | 'pending' | 'offline' | 'unauthorized' | 'error';
export interface SyncResult { status: SyncOutcome; pushed: number; pulled: number }
export interface SyncDeps { db: HiChineseDb; fetchImpl?: typeof fetch; isOnline?: () => boolean; endpoint?: string }
export function syncOnce(deps: SyncDeps): Promise<SyncResult>;

// store.ts
export type SyncStatus = 'idle' | 'syncing' | SyncOutcome;
export interface SyncState { status: SyncStatus; lastResult: SyncResult | null; lastSyncedAt: number | null }
export function getSyncState(): SyncState;
export function subscribeSync(listener: () => void): () => void;
export function useSyncState(): SyncState;
export function requestSync(deps: SyncDeps): Promise<SyncResult>;   // de-duplicates in-flight syncs
export function resetSyncStateForTests(): void;

// triggers.ts
export function installSyncTriggers(deps: SyncDeps): () => void;   // syncs now if setup is done; re-syncs on window 'online'
```

- [ ] **Step 1: Write the failing tests**

`apps/web/test/sync/merge.test.ts`:

```ts
import type { UnitProgressRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { pickWinners } from '../../src/sync/merge.js';

const row = (unitId: string, updatedAt: number): UnitProgressRow => ({
  unitId,
  status: 'completed',
  completedAt: updatedAt,
  updatedAt,
});

describe('pickWinners', () => {
  it('keeps remote rows that are new locally or strictly newer', () => {
    const local = new Map([
      ['a', row('a', 100)],
      ['b', row('b', 200)],
      ['c', row('c', 300)],
    ]);
    const remote = [row('a', 150), row('b', 200), row('c', 250), row('d', 10)];
    expect(pickWinners(remote, local, (r) => r.unitId).map((r) => r.unitId)).toEqual(['a', 'd']);
  });
});
```

`apps/web/test/sync/client.test.ts`:

```ts
import { cardId, emptyChanges, type SyncRequest, type SyncResponse } from '@hi-chinese/content';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb, outboxKey, type HiChineseDb } from '../../src/db/db.js';
import { getCursor, setMeta } from '../../src/db/meta.js';
import { completeUnit, markUnitStarted } from '../../src/db/progress.js';
import { syncOnce } from '../../src/sync/client.js';
import { requestSync, getSyncState, resetSyncStateForTests } from '../../src/sync/store.js';

let db: HiChineseDb;
beforeEach(async () => {
  db = openDb(`test-${crypto.randomUUID()}`);
  await setMeta(db, 'passphrase', 'test-passphrase');
  resetSyncStateForTests();
});
afterEach(async () => {
  await db.delete();
});

type Handler = (req: SyncRequest, init: RequestInit) => Response | Promise<Response>;
function fakeFetch(handler: Handler) {
  const calls: SyncRequest[] = [];
  const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as SyncRequest;
    calls.push(body);
    return handler(body, init ?? {});
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const echo =
  (cursor: number): Handler =>
  (req) =>
    json({ cursor, changes: req.changes } satisfies SyncResponse);

describe('syncOnce', () => {
  it('reports unauthorized without a network call when no passphrase is stored', async () => {
    await db.meta.delete('passphrase');
    const { fetchImpl, calls } = fakeFetch(echo(1));
    expect(await syncOnce({ db, fetchImpl })).toEqual({ status: 'unauthorized', pushed: 0, pulled: 0 });
    expect(calls).toHaveLength(0);
  });

  it('reports offline and keeps the outbox when the browser is offline', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl, calls } = fakeFetch(echo(1));
    expect(await syncOnce({ db, fetchImpl, isOnline: () => false })).toMatchObject({ status: 'offline' });
    expect(calls).toHaveLength(0);
    expect(await db.outbox.count()).toBe(1);
  });

  it('pushes the outbox with the bearer passphrase and cursor, then clears it and stores the new cursor', async () => {
    await completeUnit(db, { unitId: 'l1-u01', wordIds: ['w:我'], characters: ['我'], now: 1000 });
    let auth: string | null = null;
    const { fetchImpl, calls } = fakeFetch((req, init) => {
      auth = new Headers(init.headers).get('authorization');
      return echo(7)(req, init);
    });
    const result = await syncOnce({ db, fetchImpl });
    expect(result).toEqual({ status: 'synced', pushed: 5, pulled: 0 });
    expect(auth).toBe('Bearer test-passphrase');
    expect(calls[0]?.cursor).toBe(0);
    expect(calls[0]?.changes.unitProgress).toHaveLength(1);
    expect(calls[0]?.changes.cards).toHaveLength(3);
    expect(calls[0]?.changes.activity).toHaveLength(1);
    expect(await db.outbox.count()).toBe(0);
    expect(await getCursor(db)).toBe(7);
  });

  it('applies newer remote rows, ignores older ones, and drops outbox entries the remote row superseded', async () => {
    await markUnitStarted(db, 'l1-u01', 1000); // local pending, updatedAt 1000
    await markUnitStarted(db, 'l1-u02', 5000); // local pending, newer than remote
    const remote = {
      cursor: 3,
      changes: {
        unitProgress: [
          { unitId: 'l1-u01', status: 'completed', completedAt: 2000, updatedAt: 2000 },
          { unitId: 'l1-u02', status: 'completed', completedAt: 100, updatedAt: 100 },
          { unitId: 'l1-u03', status: 'in-progress', completedAt: null, updatedAt: 50 },
        ],
        cards: [],
        activity: [],
      },
    } satisfies SyncResponse;
    const { fetchImpl } = fakeFetch(() => json(remote));
    const result = await syncOnce({ db, fetchImpl });
    expect(result).toEqual({ status: 'synced', pushed: 2, pulled: 2 });
    expect((await db.unitProgress.get('l1-u01'))?.status).toBe('completed');
    expect((await db.unitProgress.get('l1-u02'))?.status).toBe('in-progress');
    expect((await db.unitProgress.get('l1-u03'))?.updatedAt).toBe(50);
    expect(await db.outbox.count()).toBe(0);
  });

  it('keeps an outbox entry that was modified while the request was in flight', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl } = fakeFetch(async (req, init) => {
      // A newer local write lands before the response arrives.
      await db.unitProgress.put({ unitId: 'l1-u01', status: 'completed', completedAt: 1500, updatedAt: 1500 });
      await db.outbox.put({ key: outboxKey('unitProgress', 'l1-u01'), table: 'unitProgress', rowKey: 'l1-u01', updatedAt: 1500 });
      return echo(2)(req, init);
    });
    const result = await syncOnce({ db, fetchImpl });
    expect(result.status).toBe('pending');
    expect(await db.outbox.toArray()).toMatchObject([{ updatedAt: 1500 }]);
  });

  it('reports unauthorized on 401 and keeps the outbox', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl } = fakeFetch(() => json({ error: 'unauthorized' }, 401));
    expect(await syncOnce({ db, fetchImpl })).toMatchObject({ status: 'unauthorized' });
    expect(await db.outbox.count()).toBe(1);
    expect(await getCursor(db)).toBe(0);
  });

  it('reports error on 5xx and network failure and keeps the outbox', async () => {
    await markUnitStarted(db, 'l1-u01', 1000);
    const { fetchImpl: five } = fakeFetch(() => json({ error: 'internal error' }, 500));
    expect(await syncOnce({ db, fetchImpl: five })).toMatchObject({ status: 'error' });
    const boom = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await syncOnce({ db, fetchImpl: boom })).toMatchObject({ status: 'error' });
    expect(await db.outbox.count()).toBe(1);
  });

  it('splits more than 500 rows per table across requests', async () => {
    const wordIds = Array.from({ length: 300 }, (_, i) => `w:x${i}`); // 600 cards
    await completeUnit(db, { unitId: 'l1-u01', wordIds, characters: [], now: 1000 });
    let n = 0;
    const { fetchImpl, calls } = fakeFetch((req, init) => echo(++n)(req, init));
    const result = await syncOnce({ db, fetchImpl });
    expect(result.status).toBe('synced');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.changes.cards).toHaveLength(500);
    expect(calls[1]?.changes.cards).toHaveLength(100);
    expect(calls[1]?.cursor).toBe(1);
    expect(await getCursor(db)).toBe(2);
    expect(await db.cards.get(cardId('word-recall', 'w:x299'))).toBeDefined();
  });
});

describe('requestSync store', () => {
  it('tracks status and de-duplicates concurrent calls', async () => {
    const { fetchImpl, calls } = fakeFetch(echo(1));
    const a = requestSync({ db, fetchImpl });
    expect(getSyncState().status).toBe('syncing');
    const b = requestSync({ db, fetchImpl });
    expect(await a).toEqual(await b);
    expect(calls).toHaveLength(1);
    expect(getSyncState()).toMatchObject({ status: 'synced', lastResult: { status: 'synced' } });
    expect(getSyncState().lastSyncedAt).not.toBeNull();
  });
});
```

Note the `pushed: 5` expectation: one word → 2 word cards + 1 char card + 1 unit row + 1 activity row.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- sync`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/sync/merge.ts`:

```ts
/**
 * Last-write-wins, the same rule the Worker applies: a remote row replaces the
 * local one only if it is strictly newer. Echoes of our own pushes have equal
 * updatedAt and are therefore no-ops.
 */
export function pickWinners<T extends { updatedAt: number }>(
  remote: readonly T[],
  local: ReadonlyMap<string, T>,
  keyOf: (row: T) => string,
): T[] {
  return remote.filter((row) => {
    const mine = local.get(keyOf(row));
    return mine === undefined || row.updatedAt > mine.updatedAt;
  });
}
```

`apps/web/src/sync/outbox.ts`:

```ts
import { emptyChanges, type SyncChanges } from '@hi-chinese/content';
import type { HiChineseDb, OutboxRow, OutboxTable } from '../db/db.js';

/** Mirrors the Worker's per-table request cap. */
export const MAX_ROWS_PER_TABLE = 500;

export interface OutboxBatch {
  changes: SyncChanges;
  /** Outbox entries whose rows are in `changes`; pass them to `ackOutbox` after a 2xx. */
  entries: OutboxRow[];
  /** Outbox entries left for a later request. */
  remaining: number;
}

const TABLES: readonly OutboxTable[] = ['unitProgress', 'cards', 'activity'];

/** Reads up to MAX_ROWS_PER_TABLE pending rows per table with their current values. */
export async function collectOutbox(db: HiChineseDb): Promise<OutboxBatch> {
  return db.transaction('r', [db.outbox, db.unitProgress, db.cards, db.activity], async () => {
    const all = await db.outbox.toArray();
    const changes = emptyChanges();
    const entries: OutboxRow[] = [];
    let remaining = 0;
    for (const table of TABLES) {
      const pending = all.filter((e) => e.table === table);
      const take = pending.slice(0, MAX_ROWS_PER_TABLE);
      remaining += pending.length - take.length;
      const keys = take.map((e) => e.rowKey);
      if (table === 'unitProgress') {
        const rows = await db.unitProgress.bulkGet(keys);
        rows.forEach((r, i) => {
          if (r !== undefined) changes.unitProgress.push(r);
          entries.push(take[i]!);
        });
      } else if (table === 'cards') {
        const rows = await db.cards.bulkGet(keys);
        rows.forEach((r, i) => {
          if (r !== undefined) changes.cards.push(r);
          entries.push(take[i]!);
        });
      } else {
        const rows = await db.activity.bulkGet(keys);
        rows.forEach((r, i) => {
          if (r !== undefined) changes.activity.push(r);
          entries.push(take[i]!);
        });
      }
    }
    return { changes, entries, remaining };
  });
}

/**
 * Removes pushed entries, unless the row changed again while the request was in
 * flight (its outbox entry now carries a newer updatedAt) — that entry stays.
 */
export async function ackOutbox(db: HiChineseDb, entries: readonly OutboxRow[]): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    const current = await db.outbox.bulkGet(entries.map((e) => e.key));
    const done: string[] = [];
    current.forEach((c, i) => {
      const pushed = entries[i]!;
      if (c !== undefined && c.updatedAt === pushed.updatedAt) done.push(c.key);
    });
    await db.outbox.bulkDelete(done);
  });
}
```

`apps/web/src/sync/apply.ts`:

```ts
import type { SyncChanges } from '@hi-chinese/content';
import { outboxKey, type HiChineseDb } from '../db/db.js';
import { pickWinners } from './merge.js';

/**
 * Writes the remote rows that win last-write-wins and drops outbox entries for
 * rows the remote superseded (their pending local value is stale). Returns the
 * number of rows written.
 */
export async function applyRemoteChanges(db: HiChineseDb, changes: SyncChanges): Promise<number> {
  return db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    let written = 0;
    const staleOutbox: string[] = [];

    const localUnits = await db.unitProgress.bulkGet(changes.unitProgress.map((r) => r.unitId));
    const unitWinners = pickWinners(
      changes.unitProgress,
      new Map(localUnits.flatMap((r) => (r ? [[r.unitId, r] as const] : []))),
      (r) => r.unitId,
    );
    await db.unitProgress.bulkPut(unitWinners);
    unitWinners.forEach((r) => staleOutbox.push(outboxKey('unitProgress', r.unitId)));
    written += unitWinners.length;

    const localCards = await db.cards.bulkGet(changes.cards.map((r) => r.cardId));
    const cardWinners = pickWinners(
      changes.cards,
      new Map(localCards.flatMap((r) => (r ? [[r.cardId, r] as const] : []))),
      (r) => r.cardId,
    );
    await db.cards.bulkPut(cardWinners);
    cardWinners.forEach((r) => staleOutbox.push(outboxKey('cards', r.cardId)));
    written += cardWinners.length;

    const localDays = await db.activity.bulkGet(changes.activity.map((r) => r.date));
    const dayWinners = pickWinners(
      changes.activity,
      new Map(localDays.flatMap((r) => (r ? [[r.date, r] as const] : []))),
      (r) => r.date,
    );
    await db.activity.bulkPut(dayWinners);
    dayWinners.forEach((r) => staleOutbox.push(outboxKey('activity', r.date)));
    written += dayWinners.length;

    if (staleOutbox.length > 0) await db.outbox.bulkDelete(staleOutbox);
    return written;
  });
}
```

`apps/web/src/sync/client.ts`:

```ts
import type { SyncRequest, SyncResponse } from '@hi-chinese/content';
import type { HiChineseDb } from '../db/db.js';
import { getCursor, getPassphrase, setMeta } from '../db/meta.js';
import { applyRemoteChanges } from './apply.js';
import { ackOutbox, collectOutbox } from './outbox.js';

export type SyncOutcome = 'synced' | 'pending' | 'offline' | 'unauthorized' | 'error';

export interface SyncResult {
  status: SyncOutcome;
  pushed: number;
  pulled: number;
}

export interface SyncDeps {
  db: HiChineseDb;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
  endpoint?: string;
}

/** Upper bound on requests per sync so a runaway outbox cannot loop forever. */
const MAX_REQUESTS = 20;

function countRows(changes: SyncRequest['changes']): number {
  return changes.unitProgress.length + changes.cards.length + changes.activity.length;
}

/**
 * One full sync: push the outbox (in batches of at most 500 rows per table) and
 * pull rows newer than our cursor, merging with last-write-wins. Never throws.
 */
export async function syncOnce(deps: SyncDeps): Promise<SyncResult> {
  const { db } = deps;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const endpoint = deps.endpoint ?? '/api/sync';

  const passphrase = await getPassphrase(db);
  if (!passphrase) return { status: 'unauthorized', pushed: 0, pulled: 0 };
  if (!isOnline()) return { status: 'offline', pushed: 0, pulled: 0 };

  let pushed = 0;
  let pulled = 0;
  for (let i = 0; i < MAX_REQUESTS; i++) {
    const batch = await collectOutbox(db);
    const request: SyncRequest = { cursor: await getCursor(db), changes: batch.changes };

    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${passphrase}` },
        body: JSON.stringify(request),
      });
    } catch {
      return { status: 'error', pushed, pulled };
    }
    if (res.status === 401) return { status: 'unauthorized', pushed, pulled };
    if (!res.ok) return { status: 'error', pushed, pulled };

    let body: SyncResponse;
    try {
      body = (await res.json()) as SyncResponse;
    } catch {
      return { status: 'error', pushed, pulled };
    }

    pulled += await applyRemoteChanges(db, body.changes);
    await ackOutbox(db, batch.entries);
    await setMeta(db, 'cursor', body.cursor);
    pushed += countRows(batch.changes);

    if (batch.remaining === 0) break;
  }

  const left = await db.outbox.count();
  return { status: left === 0 ? 'synced' : 'pending', pushed, pulled };
}
```

Why `pulled` counts only winners: echoes of our own pushes have equal `updatedAt` and are filtered out by `pickWinners`, so the count reflects rows that actually changed locally (the test expects `pulled: 0` after a pure push).

`apps/web/src/sync/store.ts`:

```ts
import { useSyncExternalStore } from 'react';
import { syncOnce, type SyncDeps, type SyncOutcome, type SyncResult } from './client.js';

export type SyncStatus = 'idle' | 'syncing' | SyncOutcome;

export interface SyncState {
  status: SyncStatus;
  lastResult: SyncResult | null;
  lastSyncedAt: number | null;
}

let state: SyncState = { status: 'idle', lastResult: null, lastSyncedAt: null };
let inFlight: Promise<SyncResult> | null = null;
const listeners = new Set<() => void>();

function set(next: SyncState): void {
  state = next;
  for (const l of listeners) l();
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
}

/** Runs a sync unless one is already running, in which case the running one is returned. */
export function requestSync(deps: SyncDeps): Promise<SyncResult> {
  if (inFlight) return inFlight;
  set({ ...state, status: 'syncing' });
  inFlight = syncOnce(deps)
    .then((result) => {
      set({
        status: result.status,
        lastResult: result,
        lastSyncedAt: result.status === 'synced' ? Date.now() : state.lastSyncedAt,
      });
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function resetSyncStateForTests(): void {
  state = { status: 'idle', lastResult: null, lastSyncedAt: null };
  inFlight = null;
  listeners.clear();
}
```

`apps/web/src/sync/triggers.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- sync` — Expected: 10 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/sync apps/web/test/sync
git commit -m "feat(web): sync client with outbox batching, LWW merge and status store"
```

---

### Task 5: Content provider, unit unlock rule, test fixtures, small UI primitives

**Files:**
- Create: `apps/web/src/content/provider.tsx`, `apps/web/src/path/unlock.ts`, `apps/web/src/ui/Loading.tsx`, `apps/web/src/ui/InlineError.tsx`, `apps/web/src/db/use-live-query.ts`, `apps/web/test/fixtures/content.ts`
- Test: `apps/web/test/path/unlock.test.ts`, `apps/web/test/content/provider.test.tsx`

**Interfaces:**
- Consumes: `buildContentIndex`, `ContentIndex`, `loadManifest`, `loadWords`, `loadUnit` (Task 2); `UnitProgressRow` from `@hi-chinese/content`.
- Produces:

```ts
// provider.tsx
export interface ContentLoaders { manifest: () => Promise<ContentManifest>; words: () => Promise<Word[]>; unit: (unitId: string) => Promise<UnitChunk> }
export const defaultLoaders: ContentLoaders;
export function ContentProvider(props: { loaders?: ContentLoaders; onReady?: (index: ContentIndex) => void; children: ReactNode }): JSX.Element;
export function ContentGate(props: { children: ReactNode }): JSX.Element;    // Loading / InlineError(retry) / children
export function useContent(): ContentIndex;                                     // only valid inside ContentGate
export type UnitChunkState = { status: 'loading' } | { status: 'error'; error: Error; retry: () => void } | { status: 'ready'; chunk: UnitChunk };
export function useUnitChunk(unitId: string): UnitChunkState;

// unlock.ts
export type UnitState = 'locked' | 'available' | 'in-progress' | 'completed';
export function computeUnitStates(unitOrder: readonly string[], rows: readonly UnitProgressRow[]): Map<string, UnitState>;

// ui
export function Loading(props: { label?: string }): JSX.Element;
export function InlineError(props: { message: string; onRetry?: () => void }): JSX.Element;   // role="alert", Retry button when onRetry given

// use-live-query.ts
export function useLiveQuery<T>(querier: () => Promise<T>, deps: readonly unknown[]): T | undefined;

// fixtures
export const fixtureManifest: ContentManifest;   // level 1 with units l1-u01 (6 words, 1 grammar, 3 sentences) and l1-u02 (4 words)
export const fixtureWords: Word[];
export const fixtureUnit1: UnitChunk;
export const fixtureUnit2: UnitChunk;
export function fixtureLoaders(): ContentLoaders;
```

- [ ] **Step 1: Fixtures**

`apps/web/test/fixtures/content.ts`:

```ts
import type { ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import type { ContentLoaders } from '../../src/content/provider.js';

function word(
  simplified: string,
  pinyin: string,
  pinyinNumeric: string,
  meanings: string[],
  unitId: string,
  frequency: number,
): Word {
  return {
    id: `w:${simplified}`,
    simplified,
    traditional: simplified,
    pinyin,
    pinyinNumeric,
    meanings,
    alternates: [],
    pos: [],
    classifiers: [],
    level: 1,
    frequency,
    characters: [...simplified],
    unitId,
  };
}

export const fixtureWords: Word[] = [
  word('我', 'wǒ', 'wo3', ['I; me'], 'l1-u01', 1),
  word('你', 'nǐ', 'ni3', ['you'], 'l1-u01', 2),
  word('他', 'tā', 'ta1', ['he; him'], 'l1-u01', 3),
  word('是', 'shì', 'shi4', ['to be; yes'], 'l1-u01', 4),
  word('不', 'bù', 'bu4', ['not; no'], 'l1-u01', 5),
  word('好', 'hǎo', 'hao3', ['good; well'], 'l1-u01', 6),
  word('们', 'men', 'men5', ['plural suffix for pronouns'], 'l1-u02', 7),
  word('老师', 'lǎoshī', 'lao3shi1', ['teacher'], 'l1-u02', 8),
  word('学生', 'xuésheng', 'xue2sheng5', ['student'], 'l1-u02', 9),
  word('吗', 'ma', 'ma5', ['question particle'], 'l1-u02', 10),
];

export const fixtureUnit1: UnitChunk = {
  unit: {
    id: 'l1-u01',
    level: 1,
    order: 1,
    title: 'Unit 1',
    wordIds: ['w:我', 'w:你', 'w:他', 'w:是', 'w:不', 'w:好'],
    grammarIds: ['g:bu-negation'],
    sentenceIds: ['s:l1:001', 's:l1:002', 's:l1:003'],
  },
  grammar: [
    {
      id: 'g:bu-negation',
      title: 'Negating with 不',
      pattern: '不 + verb / adjective',
      explanation: '不 (bù) goes directly before a verb or adjective to negate it.',
      level: 1,
      sentenceIds: ['s:l1:002', 's:l1:003'],
      unitId: 'l1-u01',
    },
  ],
  sentences: [
    { id: 's:l1:001', zh: '你好。', pinyin: 'Nǐ hǎo.', en: 'Hello.', wordIds: ['w:你', 'w:好'], unitId: 'l1-u01' },
    { id: 's:l1:002', zh: '我不是他。', pinyin: 'Wǒ bú shì tā.', en: 'I am not him.', wordIds: ['w:我', 'w:不', 'w:是', 'w:他'], unitId: 'l1-u01' },
    { id: 's:l1:003', zh: '他不好。', pinyin: 'Tā bù hǎo.', en: 'He is not well.', wordIds: ['w:他', 'w:不', 'w:好'], unitId: 'l1-u01' },
  ],
};

export const fixtureUnit2: UnitChunk = {
  unit: {
    id: 'l1-u02',
    level: 1,
    order: 2,
    title: 'Unit 2',
    wordIds: ['w:们', 'w:老师', 'w:学生', 'w:吗'],
    grammarIds: [],
    sentenceIds: [],
  },
  grammar: [],
  sentences: [],
};

export const fixtureManifest: ContentManifest = {
  version: 'fixture',
  generatedAt: '2026-09-10T00:00:00.000Z',
  levels: [{ level: 1, title: 'HSK 1', unitIds: ['l1-u01', 'l1-u02'] }],
  units: [
    { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 6, grammarCount: 1 },
    { id: 'l1-u02', level: 1, order: 2, title: 'Unit 2', wordCount: 4, grammarCount: 0 },
  ],
  characters: [],
  counts: { words: 10, characters: 0, grammar: 1, sentences: 3, units: 2 },
};

export function fixtureLoaders(): ContentLoaders {
  return {
    manifest: async () => fixtureManifest,
    words: async () => fixtureWords,
    unit: async (unitId) => {
      if (unitId === 'l1-u01') return fixtureUnit1;
      if (unitId === 'l1-u02') return fixtureUnit2;
      throw new Error(`no fixture unit ${unitId}`);
    },
  };
}
```

- [ ] **Step 2: Write the failing tests**

`apps/web/test/path/unlock.test.ts`:

```ts
import type { UnitProgressRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeUnitStates } from '../../src/path/unlock.js';

const order = ['l1-u01', 'l1-u02', 'l1-u03', 'l1-u04'];
const row = (unitId: string, status: UnitProgressRow['status']): UnitProgressRow => ({
  unitId,
  status,
  completedAt: status === 'completed' ? 1 : null,
  updatedAt: 1,
});

describe('computeUnitStates', () => {
  it('unlocks only the first unit when nothing is done', () => {
    const s = computeUnitStates(order, []);
    expect([...s.values()]).toEqual(['available', 'locked', 'locked', 'locked']);
  });

  it('unlocks the unit after the last completed one and keeps earlier units available', () => {
    const s = computeUnitStates(order, [row('l1-u01', 'completed'), row('l1-u02', 'completed')]);
    expect([...s.values()]).toEqual(['completed', 'completed', 'available', 'locked']);
  });

  it('shows in-progress for opened units before the frontier', () => {
    const s = computeUnitStates(order, [row('l1-u01', 'in-progress')]);
    expect([...s.values()]).toEqual(['in-progress', 'locked', 'locked', 'locked']);
  });

  it('uses the furthest completed unit as the frontier even with gaps', () => {
    const s = computeUnitStates(order, [row('l1-u03', 'completed')]);
    expect([...s.values()]).toEqual(['available', 'available', 'completed', 'available']);
  });

  it('ignores rows for units that are not in the path', () => {
    const s = computeUnitStates(order, [row('zz', 'completed')]);
    expect(s.get('zz')).toBeUndefined();
    expect(s.get('l1-u01')).toBe('available');
  });
});
```

`apps/web/test/content/provider.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentGate, ContentProvider, useContent, useUnitChunk } from '../../src/content/provider.js';
import { fixtureLoaders, fixtureManifest } from '../fixtures/content.js';

function ShowCounts() {
  const content = useContent();
  return <p>{`${content.words.size} words, ${content.unitOrder.length} units`}</p>;
}

function ShowUnit({ unitId }: { unitId: string }) {
  const state = useUnitChunk(unitId);
  if (state.status === 'loading') return <p>loading unit</p>;
  if (state.status === 'error')
    return (
      <button type="button" onClick={state.retry}>
        unit failed: {state.error.message}
      </button>
    );
  return <p>{state.chunk.unit.title}</p>;
}

describe('ContentProvider', () => {
  it('shows the children once manifest and words are loaded and reports the version', async () => {
    const onReady = vi.fn();
    render(
      <ContentProvider loaders={fixtureLoaders()} onReady={onReady}>
        <ContentGate>
          <ShowCounts />
        </ContentGate>
      </ContentProvider>,
    );
    expect(await screen.findByText('10 words, 2 units')).toBeTruthy();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]?.[0].manifest.version).toBe(fixtureManifest.version);
  });

  it('shows an inline error with retry when loading fails, then recovers', async () => {
    const loaders = fixtureLoaders();
    const words = vi
      .fn<() => Promise<never[]>>()
      .mockRejectedValueOnce(new Error('HTTP 500 (/content/words.json)'))
      .mockImplementation(async () => []);
    render(
      <ContentProvider loaders={{ ...loaders, words }}>
        <ContentGate>
          <ShowCounts />
        </ContentGate>
      </ContentProvider>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('HTTP 500');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('0 words, 2 units')).toBeTruthy();
  });

  it('loads unit chunks on demand and retries after a failure', async () => {
    const loaders = fixtureLoaders();
    const unit = vi
      .fn<(id: string) => Promise<never>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation((id) => loaders.unit(id) as Promise<never>);
    render(
      <ContentProvider loaders={{ ...loaders, unit }}>
        <ContentGate>
          <ShowUnit unitId="l1-u01" />
        </ContentGate>
      </ContentProvider>,
    );
    const failed = await screen.findByRole('button', { name: /unit failed: offline/ });
    fireEvent.click(failed);
    expect(await screen.findByText('Unit 1')).toBeTruthy();
    expect(unit).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- unlock provider`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement**

`apps/web/src/path/unlock.ts`:

```ts
import type { UnitProgressRow } from '@hi-chinese/content';

export type UnitState = 'locked' | 'available' | 'in-progress' | 'completed';

/**
 * Spec §4: the unit after the last completed one is unlocked; everything before it
 * stays available (or shows its own progress); everything after it is locked.
 */
export function computeUnitStates(
  unitOrder: readonly string[],
  rows: readonly UnitProgressRow[],
): Map<string, UnitState> {
  const byId = new Map(rows.map((r) => [r.unitId, r] as const));
  let frontier = 0;
  unitOrder.forEach((id, i) => {
    if (byId.get(id)?.status === 'completed') frontier = Math.max(frontier, i + 1);
  });
  const states = new Map<string, UnitState>();
  unitOrder.forEach((id, i) => {
    const row = byId.get(id);
    if (row?.status === 'completed') states.set(id, 'completed');
    else if (i > frontier) states.set(id, 'locked');
    else if (row?.status === 'in-progress') states.set(id, 'in-progress');
    else states.set(id, 'available');
  });
  return states;
}
```

`apps/web/src/ui/Loading.tsx`:

```tsx
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-stone-500">
      {label}
    </p>
  );
}
```

`apps/web/src/ui/InlineError.tsx`:

```tsx
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

`apps/web/src/db/use-live-query.ts`:

```ts
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/** Re-runs `querier` whenever the Dexie tables it reads change. `undefined` until the first result. */
export function useLiveQuery<T>(querier: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: (v) => setValue(v),
      error: (err: unknown) => console.error('live query failed', err),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's query inputs
  }, deps);
  return value;
}
```

`apps/web/src/content/provider.tsx`:

```tsx
import type { ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { buildContentIndex, type ContentIndex } from './index.js';
import { loadManifest, loadUnit, loadWords } from './loader.js';

export interface ContentLoaders {
  manifest: () => Promise<ContentManifest>;
  words: () => Promise<Word[]>;
  unit: (unitId: string) => Promise<UnitChunk>;
}

export const defaultLoaders: ContentLoaders = {
  manifest: () => loadManifest(),
  words: () => loadWords(),
  unit: (unitId) => loadUnit(unitId),
};

type ContentState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; index: ContentIndex };

interface ContentContextValue {
  state: ContentState;
  retry: () => void;
  loaders: ContentLoaders;
}

const ContentContext = createContext<ContentContextValue | null>(null);

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function ContentProvider({
  loaders = defaultLoaders,
  onReady,
  children,
}: {
  loaders?: ContentLoaders;
  onReady?: (index: ContentIndex) => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<ContentState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([loaders.manifest(), loaders.words()])
      .then(([manifest, words]) => {
        if (cancelled) return;
        const index = buildContentIndex(manifest, words);
        setState({ status: 'ready', index });
        onReady?.(index);
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toError(err) });
      });
    return () => {
      cancelled = true;
    };
    // onReady is a notification callback, not an input; re-running on its identity would reload content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return (
    <ContentContext.Provider value={{ state, retry, loaders }}>{children}</ContentContext.Provider>
  );
}

function useContentContext(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('Content hooks must be used inside <ContentProvider>');
  return ctx;
}

export function ContentGate({ children }: { children: ReactNode }) {
  const { state, retry } = useContentContext();
  if (state.status === 'loading') return <Loading label="Loading course…" />;
  if (state.status === 'error')
    return <InlineError message={`Could not load the course: ${state.error.message}`} onRetry={retry} />;
  return <>{children}</>;
}

export function useContent(): ContentIndex {
  const { state } = useContentContext();
  if (state.status !== 'ready') throw new Error('useContent called before content is ready');
  return state.index;
}

export type UnitChunkState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; chunk: UnitChunk };

export function useUnitChunk(unitId: string): UnitChunkState {
  const { loaders } = useContentContext();
  const [state, setState] = useState<Omit<UnitChunkState, 'retry'>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loaders
      .unit(unitId)
      .then((chunk) => {
        if (!cancelled) setState({ status: 'ready', chunk });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [loaders, unitId, attempt]);

  if (state.status === 'error') return { status: 'error', error: state.error, retry };
  return state as UnitChunkState;
}
```

Note: `Omit<UnitChunkState, 'retry'>` on a union distributes poorly; if TypeScript complains, define an internal union `type Inner = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; chunk: UnitChunk }` and use it for the state instead. The public type stays as documented.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- unlock provider` — Expected: 8 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/content/provider.tsx apps/web/src/path/unlock.ts apps/web/src/ui apps/web/src/db/use-live-query.ts apps/web/test/fixtures apps/web/test/path apps/web/test/content/provider.test.tsx
git commit -m "feat(web): content provider, unit unlock rule and shared test fixtures"
```

---

### Task 6: App shell, router, setup, settings, path and unit screens

**Files:**
- Create: `apps/web/src/router.tsx`, `apps/web/src/ui/AppShell.tsx`, `apps/web/src/ui/Header.tsx`, `apps/web/src/ui/UpdateToast.tsx`, `apps/web/src/ui/RouteError.tsx`, `apps/web/src/setup/SetupScreen.tsx`, `apps/web/src/settings/SettingsScreen.tsx`, `apps/web/src/path/PathScreen.tsx`, `apps/web/src/path/UnitScreen.tsx`
- Modify: `apps/web/src/main.tsx` (router + sync triggers); Delete: `apps/web/src/App.tsx`, `apps/web/test/app.test.tsx`
- Test: `apps/web/test/shell.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–5 (`db`, `setMeta`, `isSetupDone`, `requestSync`, `useSyncState`, `installSyncTriggers`, `ContentProvider`, `ContentGate`, `useContent`, `computeUnitStates`, `useLiveQuery`, `Loading`, `InlineError`).
- Produces:

```ts
// router.tsx
export const rootRoute, indexRoute, setupRoute, settingsRoute, unitRoute;   // Tasks 7 and 10 add learnRoute and practiceRoute here
export function createAppRouter(history?: RouterHistory): ReturnType<typeof createRouter>;
export const router: ReturnType<typeof createAppRouter>;
// Header.tsx
export function Header(): JSX.Element;            // contains <SyncIndicator/> with data-testid="sync-status"
export function SyncIndicator(): JSX.Element;
// screens: SetupScreen, SettingsScreen, PathScreen, UnitScreen (default-less named exports)
```

Route table (all children of the root route): `/` → PathScreen, `/setup` → SetupScreen, `/settings` → SettingsScreen, `/unit/$unitId` → UnitScreen. Root `beforeLoad` redirects to `/setup` when setup is not done (except on `/setup` itself).

Path node markup contract (used by the end-to-end test): each unit is `<li data-testid="unit-<id>" data-state="<UnitState>">`; non-locked units contain a `Link` whose accessible name starts with the unit title (for example "Unit 1").

- [ ] **Step 1: Write the failing integration test**

`apps/web/test/shell.test.tsx`:

```tsx
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
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
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
          unitProgress: [{ unitId: 'l1-u01', status: 'completed', completedAt: 100, updatedAt: 100 }],
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
    fireEvent.change(await screen.findByLabelText('Passphrase'), { target: { value: 'test-passphrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue offline' }));
    expect(await screen.findByRole('heading', { name: 'HSK 1' })).toBeTruthy();
    expect(screen.getByTestId('unit-l1-u01').dataset['state']).toBe('available');
    expect(screen.getByTestId('unit-l1-u02').dataset['state']).toBe('locked');
  });

  it('shows the unit screen with Learn and Practice for an available unit', async () => {
    stubFetch(() => json({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } }));
    await db.meta.put({ key: 'setupDone', value: true });
    renderApp('/unit/l1-u01');
    expect(await screen.findByRole('heading', { name: 'Unit 1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Learn' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Practice' })).toBeTruthy();
    expect(screen.getByText('6 words, 1 grammar point')).toBeTruthy();
  });

  it('explains a locked unit instead of offering its steps', async () => {
    stubFetch(() => json({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } }));
    await db.meta.put({ key: 'setupDone', value: true });
    renderApp('/unit/l1-u02');
    expect(await screen.findByText(/locked/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Practice' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @hi-chinese/web test -- shell`
Expected: FAIL, cannot find `../src/router.js`.

- [ ] **Step 3: Implement the shell**

`apps/web/src/ui/Header.tsx`:

```tsx
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
      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${DOTS[status]}`} />
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
```

`apps/web/src/ui/UpdateToast.tsx`:

```tsx
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
        <button type="button" onClick={() => setNeedRefresh(false)} className="px-2 text-sm underline">
          Later
        </button>
      </div>
    </div>
  );
}
```

`apps/web/src/ui/RouteError.tsx`:

```tsx
import { Link, type ErrorComponentProps } from '@tanstack/react-router';

export function RouteError({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="my-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm">{message}</p>
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={reset} className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white">
          Try again
        </button>
        <Link to="/" className="px-3 py-1.5 text-sm underline">
          Back to path
        </Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="py-8 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <Link to="/" className="mt-3 inline-block underline">
        Back to path
      </Link>
    </div>
  );
}
```

`apps/web/src/ui/AppShell.tsx`:

```tsx
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
```

`apps/web/src/setup/SetupScreen.tsx`:

```tsx
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
      <p className="text-stone-600">Enter your sync passphrase to load your progress on this device.</p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Passphrase
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
```

`apps/web/src/settings/SettingsScreen.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useHasChineseVoiceSafe } from './voice-status.js';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { setMeta } from '../db/meta.js';
import { requestSync, useSyncState } from '../sync/store.js';
import { SyncIndicator } from '../ui/Header.js';

export function SettingsScreen() {
  const content = useContent();
  const sync = useSyncState();
  const hasVoice = useHasChineseVoiceSafe();
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
          <p className="text-sm text-stone-600">Last synced {new Date(sync.lastSyncedAt).toLocaleString()}</p>
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
        <p>{hasVoice ? 'Chinese voice: available.' : 'Chinese voice: not installed. Audio buttons are disabled.'}</p>
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
```

`apps/web/src/settings/voice-status.ts` (a tiny hook so this task does not depend on Task 7; Task 7 replaces its body with the real `useHasChineseVoice`):

```ts
/** Reports whether a Chinese speech-synthesis voice is present. Task 7 wires the live version. */
export function useHasChineseVoiceSafe(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.getVoices().some((v) => /^zh([-_]|$)/i.test(v.lang));
}
```

`apps/web/src/path/PathScreen.tsx`:

```tsx
import type { ManifestUnit } from '@hi-chinese/content';
import { Link } from '@tanstack/react-router';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { Loading } from '../ui/Loading.js';
import { computeUnitStates, type UnitState } from './unlock.js';

const BADGE: Record<UnitState, string> = {
  locked: 'bg-stone-200 text-stone-500',
  available: 'bg-white text-stone-900 border border-stone-300',
  'in-progress': 'bg-amber-100 text-amber-900 border border-amber-300',
  completed: 'bg-green-100 text-green-900 border border-green-300',
};

const LABEL: Record<UnitState, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'In progress',
  completed: 'Completed',
};

function UnitNode({ unit, state }: { unit: ManifestUnit; state: UnitState }) {
  const inner = (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${BADGE[state]}`}>
      <div>
        <div className="font-medium">{unit.title}</div>
        <div className="text-xs opacity-70">
          {unit.wordCount} words
          {unit.grammarCount > 0 ? `, ${unit.grammarCount} grammar` : ''}
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-wide">{LABEL[state]}</span>
    </div>
  );
  return (
    <li data-testid={`unit-${unit.id}`} data-state={state}>
      {state === 'locked' ? (
        <div aria-disabled="true">{inner}</div>
      ) : (
        <Link to="/unit/$unitId" params={{ unitId: unit.id }} aria-label={`${unit.title}, ${LABEL[state]}`}>
          {inner}
        </Link>
      )}
    </li>
  );
}

export function PathScreen() {
  const content = useContent();
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  if (rows === undefined) return <Loading />;
  const states = computeUnitStates(content.unitOrder, rows);
  return (
    <div className="flex flex-col gap-8">
      {content.manifest.levels.map((level) => (
        <section key={level.level} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{level.title}</h2>
          <ol className="flex flex-col gap-2">
            {level.unitIds.map((id) => {
              const unit = content.unitById.get(id);
              if (!unit) return null;
              return <UnitNode key={id} unit={unit} state={states.get(id) ?? 'locked'} />;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
```

`apps/web/src/path/UnitScreen.tsx`:

```tsx
import { Link, useParams } from '@tanstack/react-router';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { Loading } from '../ui/Loading.js';
import { computeUnitStates } from './unlock.js';

export function UnitScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId' });
  const content = useContent();
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  const unit = content.unitById.get(unitId);
  if (!unit) return <p role="alert">Unknown unit.</p>;
  if (rows === undefined) return <Loading />;
  const state = computeUnitStates(content.unitOrder, rows).get(unitId) ?? 'locked';
  const grammar =
    unit.grammarCount === 1 ? '1 grammar point' : `${unit.grammarCount} grammar points`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="text-stone-600">
          {unit.wordCount} words, {grammar}
        </p>
      </div>
      {state === 'locked' ? (
        <p className="rounded-lg bg-stone-100 p-4 text-stone-700">
          This unit is locked. Complete the previous unit first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            to="/unit/$unitId/learn"
            params={{ unitId }}
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-center font-medium"
          >
            Learn
          </Link>
          <Link
            to="/unit/$unitId/practice"
            params={{ unitId }}
            className="rounded-lg bg-red-700 px-4 py-3 text-center font-medium text-white"
          >
            Practice
          </Link>
        </div>
      )}
      <Link to="/" className="text-sm underline">
        Back to path
      </Link>
    </div>
  );
}
```

The `/unit/$unitId/learn` and `/unit/$unitId/practice` links need routes to typecheck. Task 6 registers them pointing at a shared placeholder so the shell compiles; Tasks 7 and 10 swap in the real screens:

`apps/web/src/router.tsx`:

```tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { db } from './db/db.js';
import { isSetupDone } from './db/meta.js';
import { PathScreen } from './path/PathScreen.js';
import { UnitScreen } from './path/UnitScreen.js';
import { SettingsScreen } from './settings/SettingsScreen.js';
import { SetupScreen } from './setup/SetupScreen.js';
import { AppShell } from './ui/AppShell.js';
import { NotFound, RouteError } from './ui/RouteError.js';

export const rootRoute = createRootRoute({
  component: AppShell,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
  beforeLoad: async ({ location }) => {
    if (location.pathname !== '/setup' && !(await isSetupDone(db))) {
      throw redirect({ to: '/setup' });
    }
  },
});

export const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: PathScreen });
export const setupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: SetupScreen });
export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsScreen,
});
export const unitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId',
  component: UnitScreen,
});

// Replaced by the real screens in Task 7 (learn) and Task 10 (practice).
function StepPending() {
  return <p className="text-stone-600">This step is not available yet.</p>;
}
export const learnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/learn',
  component: StepPending,
});
export const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/practice',
  component: StepPending,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  setupRoute,
  settingsRoute,
  unitRoute,
  learnRoute,
  practiceRoute,
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

`apps/web/src/main.tsx` (replace the file):

```tsx
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './db/db.js';
import { router } from './router.js';
import { installSyncTriggers } from './sync/triggers.js';
import './app.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root element');
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
installSyncTriggers({ db });
```

Delete `apps/web/src/App.tsx` and `apps/web/test/app.test.tsx`.

- [ ] **Step 4: Run tests, typecheck, build**

Run: `pnpm -F @hi-chinese/web test` — Expected: all passing, including the 5 shell tests.
Run: `pnpm -F @hi-chinese/web typecheck && pnpm -F @hi-chinese/web build` — Expected: clean.
Manual smoke (optional but recommended): `pnpm worker:migrate:local`, copy `.dev.vars.example` to `.dev.vars` with `SYNC_PASSPHRASE=test-passphrase`, then `pnpm dev`; open http://127.0.0.1:5173, enter the passphrase, confirm the path renders and the header says "Synced".

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): app shell with router, setup, settings, path and unit screens"
```

---

### Task 7: Speech audio helper and the Learn screen

**Files:**
- Create: `apps/web/src/audio/speech.ts`, `apps/web/src/audio/SpeakButton.tsx`, `apps/web/src/learn/LearnScreen.tsx`
- Modify: `apps/web/src/router.tsx` (learnRoute component → `LearnScreen`), `apps/web/src/settings/voice-status.ts` (delegate to `useHasChineseVoice`)
- Test: `apps/web/test/audio/speech.test.ts`, `apps/web/test/learn/WordCard.test.tsx`

**Interfaces:**
- Consumes: `useContent`, `useUnitChunk` (Task 5), `markUnitStarted`, `db` (Task 3), `Loading`, `InlineError`.
- Produces:

```ts
// speech.ts
export function chineseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null;  // zh-CN > zh-Hans > any zh
export function getChineseVoice(): SpeechSynthesisVoice | null;
export function speak(text: string): boolean;              // false when no synth or no Chinese voice
export function subscribeVoices(cb: () => void): () => void;
export function useHasChineseVoice(): boolean;
// SpeakButton.tsx
export function SpeakButton(props: { text: string; label?: string; size?: 'sm' | 'lg' }): JSX.Element;   // disabled without a voice
export function NoVoiceBanner(): JSX.Element | null;       // install hint; null when a voice exists
// LearnScreen.tsx
export function WordCard(props: { word: Word }): JSX.Element;
export function GrammarCard(props: { point: GrammarPoint; examples: Sentence[] }): JSX.Element;
export function LearnScreen(): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

`apps/web/test/audio/speech.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { chineseVoice, speak } from '../../src/audio/speech.js';

const voice = (lang: string, name = lang) => ({ lang, name }) as unknown as SpeechSynthesisVoice;

describe('chineseVoice', () => {
  it('prefers zh-CN, then zh-Hans, then any Chinese voice', () => {
    expect(chineseVoice([voice('en-US'), voice('zh-TW'), voice('zh-CN')])?.lang).toBe('zh-CN');
    expect(chineseVoice([voice('zh-TW'), voice('zh-Hans-CN')])?.lang).toBe('zh-Hans-CN');
    expect(chineseVoice([voice('zh_TW')])?.lang).toBe('zh_TW');
    expect(chineseVoice([voice('en-GB'), voice('ja-JP')])).toBeNull();
  });
  it('accepts underscore locales but not other languages starting with zh letters', () => {
    expect(chineseVoice([voice('zhx-XX')])).toBeNull();
  });
});

describe('speak', () => {
  it('returns false when speech synthesis is unavailable', () => {
    expect(speak('你好')).toBe(false);
  });
});
```

`apps/web/test/learn/WordCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordCard } from '../../src/learn/LearnScreen.js';
import { fixtureWords } from '../fixtures/content.js';

describe('WordCard', () => {
  it('shows the character, pinyin and meaning with a disabled play button when no voice exists', () => {
    render(<WordCard word={fixtureWords[0]!} />);
    expect(screen.getByText('我')).toBeTruthy();
    expect(screen.getByText('wǒ')).toBeTruthy();
    expect(screen.getByText('I; me')).toBeTruthy();
    const play = screen.getByRole('button', { name: 'Play 我' });
    expect(play).toHaveProperty('disabled', true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- speech WordCard`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/audio/speech.ts`:

```ts
import { useSyncExternalStore } from 'react';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

const ZH = /^zh([-_]|$)/i;

/** Picks a Mandarin voice: zh-CN first, then zh-Hans, then any Chinese voice. */
export function chineseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const zh = voices.filter((v) => ZH.test(v.lang));
  return (
    zh.find((v) => /^zh[-_]CN/i.test(v.lang)) ??
    zh.find((v) => /^zh[-_]Hans/i.test(v.lang)) ??
    zh[0] ??
    null
  );
}

export function getChineseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  return s ? chineseVoice(s.getVoices()) : null;
}

/** Speaks `text` with the Chinese voice. Returns false (and does nothing) when none is available. */
export function speak(text: string): boolean {
  const s = synth();
  const voice = getChineseVoice();
  if (!s || !voice) return false;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  s.speak(utterance);
  return true;
}

/** Voices load asynchronously in most browsers; `voiceschanged` fires when the list is ready. */
export function subscribeVoices(cb: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener('voiceschanged', cb);
  return () => s.removeEventListener('voiceschanged', cb);
}

export function useHasChineseVoice(): boolean {
  return useSyncExternalStore(
    subscribeVoices,
    () => getChineseVoice() !== null,
    () => false,
  );
}
```

`apps/web/src/settings/voice-status.ts` (replace body):

```ts
import { useHasChineseVoice } from '../audio/speech.js';

export function useHasChineseVoiceSafe(): boolean {
  return useHasChineseVoice();
}
```

Then replace the import in `SettingsScreen.tsx` with `useHasChineseVoice` from `../audio/speech.js` and delete `voice-status.ts` (the indirection was only there so Task 6 could ship before Task 7).

`apps/web/src/audio/SpeakButton.tsx`:

```tsx
import { speak, useHasChineseVoice } from './speech.js';

export function SpeakButton({ text, label, size = 'sm' }: { text: string; label?: string; size?: 'sm' | 'lg' }) {
  const hasVoice = useHasChineseVoice();
  const dims = size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  return (
    <button
      type="button"
      aria-label={label ?? `Play ${text}`}
      title={hasVoice ? undefined : 'No Chinese voice installed'}
      disabled={!hasVoice}
      onClick={() => speak(text)}
      className={`inline-flex items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 disabled:opacity-40 ${dims}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
      </svg>
    </button>
  );
}

/** Spec §8: when no Chinese voice exists, explain how to install one; audio buttons stay disabled. */
export function NoVoiceBanner() {
  const hasVoice = useHasChineseVoice();
  if (hasVoice) return null;
  return (
    <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">No Chinese voice is installed, so audio is disabled.</p>
      <p className="mt-1">
        Install a Mandarin (zh-CN) text-to-speech voice in your system settings (Android: Google
        Text-to-speech, Windows: Time and Language, Speech; macOS/iOS: Accessibility, Spoken Content),
        then reload this page.
      </p>
    </div>
  );
}
```

`apps/web/src/learn/LearnScreen.tsx`:

```tsx
import type { GrammarPoint, Sentence, Word } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { NoVoiceBanner, SpeakButton } from '../audio/SpeakButton.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { markUnitStarted } from '../db/progress.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function WordCard({ word }: { word: Word }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <div className="text-3xl">{word.simplified}</div>
        <div className="text-stone-600">{word.pinyin}</div>
        <ul className="mt-1 text-sm text-stone-800">
          {word.meanings.slice(0, 2).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        {word.traditional !== word.simplified && (
          <div className="mt-1 text-xs text-stone-500">Traditional: {word.traditional}</div>
        )}
      </div>
      <SpeakButton text={word.simplified} />
    </li>
  );
}

export function GrammarCard({ point, examples }: { point: GrammarPoint; examples: Sentence[] }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">{point.title}</h3>
      <p className="font-mono text-sm text-red-800">{point.pattern}</p>
      <p className="text-sm text-stone-800">{point.explanation}</p>
      <ul className="mt-1 flex flex-col gap-2">
        {examples.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2">
            <div>
              <div className="text-lg">{s.zh}</div>
              <div className="text-sm text-stone-600">{s.pinyin}</div>
              <div className="text-sm text-stone-800">{s.en}</div>
            </div>
            <SpeakButton text={s.zh} />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function LearnScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId/learn' });
  const content = useContent();
  const chunk = useUnitChunk(unitId);

  useEffect(() => {
    void markUnitStarted(db, unitId, Date.now());
  }, [unitId]);

  if (chunk.status === 'loading') return <Loading label="Loading unit…" />;
  if (chunk.status === 'error')
    return <InlineError message={`Could not load this unit: ${chunk.error.message}`} onRetry={chunk.retry} />;

  const { unit, grammar, sentences } = chunk.chunk;
  const sentenceById = new Map(sentences.map((s) => [s.id, s] as const));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{unit.title}: Learn</h1>
      <NoVoiceBanner />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New words</h2>
        <ul className="flex flex-col gap-2">
          {unit.wordIds.map((id) => {
            const word = content.words.get(id);
            return word ? <WordCard key={id} word={word} /> : null;
          })}
        </ul>
      </section>
      {grammar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Grammar</h2>
          {grammar.map((g) => (
            <GrammarCard
              key={g.id}
              point={g}
              examples={g.sentenceIds.flatMap((sid) => {
                const s = sentenceById.get(sid);
                return s ? [s] : [];
              })}
            />
          ))}
        </section>
      )}
      <Link
        to="/unit/$unitId/practice"
        params={{ unitId }}
        className="rounded-lg bg-red-700 px-4 py-3 text-center font-medium text-white"
      >
        Start practice
      </Link>
    </div>
  );
}
```

In `apps/web/src/router.tsx`, import `LearnScreen` and set `learnRoute`'s `component: LearnScreen` (leave `practiceRoute` on `StepPending` until Task 10).

- [ ] **Step 4: Run tests, typecheck**

Run: `pnpm -F @hi-chinese/web test` — Expected: all passing (speech 3, WordCard 1 added).
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): speech synthesis helper and Learn screen"
```

---

### Task 8: Exercise types and session generator (pure)

**Files:**
- Create: `apps/web/src/exercises/random.ts`, `apps/web/src/exercises/types.ts`, `apps/web/src/exercises/generate.ts`
- Test: `apps/web/test/exercises/random.test.ts`, `apps/web/test/exercises/types.test.ts`, `apps/web/test/exercises/generate.test.ts`

**Interfaces:**
- Consumes: `UnitChunk`, `Word`, `Sentence` from `@hi-chinese/content`; fixtures from Task 5.
- Produces:

```ts
// random.ts
export type Rng = () => number;                        // uniform in [0, 1)
export function mulberry32(seed: number): Rng;
export function shuffle<T>(items: readonly T[], rng: Rng): T[];
export function pick<T>(items: readonly T[], n: number, rng: Rng): T[];
export function randomInt(maxExclusive: number, rng: Rng): number;

// types.ts
export type ChoiceDirection = 'zh-en' | 'en-zh' | 'pinyin-zh';
export interface MultipleChoiceExercise { kind: 'multiple-choice'; id: string; wordId: string; direction: ChoiceDirection; prompt: string; promptSub: string | null; speech: string | null; options: string[]; correctIndex: number }
export interface ListenPickExercise { kind: 'listen-pick'; id: string; wordId: string; speech: string; options: string[]; correctIndex: number }
export interface MatchPairsExercise { kind: 'match-pairs'; id: string; pairs: { wordId: string; zh: string; en: string }[] }
export interface SentenceBuilderExercise { kind: 'sentence-builder'; id: string; sentenceId: string; en: string; speech: string; answer: string[]; tiles: string[] }
export interface FillBlankExercise { kind: 'fill-blank'; id: string; sentenceId: string; grammarId: string | null; tokens: string[]; blankIndex: number; en: string; options: string[]; correctIndex: number }
export type Exercise = MultipleChoiceExercise | ListenPickExercise | MatchPairsExercise | SentenceBuilderExercise | FillBlankExercise;
export type Answer = { kind: 'choice'; index: number } | { kind: 'order'; tiles: string[] } | { kind: 'pairs'; mismatches: number };
export function checkAnswer(exercise: Exercise, answer: Answer): boolean;
export function correctAnswerText(exercise: Exercise): string;

// generate.ts
export const SESSION_SIZE = 15;
export interface SessionInput { chunk: UnitChunk; words: ReadonlyMap<string, Word>; levelWordIds: readonly string[]; audio: boolean }
export function primaryMeaning(word: Word): string;      // first meaning, text before the first ';'
export function tokensOf(sentence: Sentence, words: ReadonlyMap<string, Word>): string[];
export function generateSession(input: SessionInput, seed: number): Exercise[];
```

- [ ] **Step 1: Write the failing tests**

`apps/web/test/exercises/random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, pick, randomInt, shuffle } from '../../src/exercises/random.js';

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(90);
  });
});

describe('shuffle / pick / randomInt', () => {
  it('shuffle keeps every element exactly once and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(out).not.toEqual(input);
  });
  it('pick returns n distinct elements', () => {
    const out = pick(['a', 'b', 'c', 'd'], 3, mulberry32(7));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
  it('randomInt stays below the bound', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const n = randomInt(4, rng);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(4);
    }
  });
});
```

`apps/web/test/exercises/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkAnswer, correctAnswerText, type Exercise } from '../../src/exercises/types.js';

const mc: Exercise = {
  kind: 'multiple-choice',
  id: 'mc:1',
  wordId: 'w:我',
  direction: 'zh-en',
  prompt: '我',
  promptSub: 'wǒ',
  speech: '我',
  options: ['you', 'I', 'he', 'good'],
  correctIndex: 1,
};
const builder: Exercise = {
  kind: 'sentence-builder',
  id: 'sb:1',
  sentenceId: 's:l1:002',
  en: 'I am not him.',
  speech: '我不是他。',
  answer: ['我', '不', '是', '他'],
  tiles: ['他', '我', '好', '不', '是', '你'],
};
const pairs: Exercise = {
  kind: 'match-pairs',
  id: 'mp:1',
  pairs: [
    { wordId: 'w:我', zh: '我', en: 'I' },
    { wordId: 'w:你', zh: '你', en: 'you' },
  ],
};

describe('checkAnswer', () => {
  it('grades choices by index', () => {
    expect(checkAnswer(mc, { kind: 'choice', index: 1 })).toBe(true);
    expect(checkAnswer(mc, { kind: 'choice', index: 0 })).toBe(false);
    expect(checkAnswer(mc, { kind: 'order', tiles: [] })).toBe(false);
  });
  it('grades tile order exactly', () => {
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '不', '是', '他'] })).toBe(true);
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '是', '不', '他'] })).toBe(false);
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '不', '是'] })).toBe(false);
  });
  it('accepts pairs only without mismatches', () => {
    expect(checkAnswer(pairs, { kind: 'pairs', mismatches: 0 })).toBe(true);
    expect(checkAnswer(pairs, { kind: 'pairs', mismatches: 1 })).toBe(false);
  });
});

describe('correctAnswerText', () => {
  it('renders the expected answer for feedback', () => {
    expect(correctAnswerText(mc)).toBe('I');
    expect(correctAnswerText(builder)).toBe('我不是他');
    expect(correctAnswerText(pairs)).toBe('我 = I, 你 = you');
  });
});
```

`apps/web/test/exercises/generate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateSession, primaryMeaning, SESSION_SIZE, tokensOf, type SessionInput } from '../../src/exercises/generate.js';
import type { Exercise } from '../../src/exercises/types.js';
import { fixtureUnit1, fixtureWords } from '../fixtures/content.js';

const words = new Map(fixtureWords.map((w) => [w.id, w] as const));
const input: SessionInput = {
  chunk: fixtureUnit1,
  words,
  levelWordIds: fixtureWords.map((w) => w.id),
  audio: false,
};

const byKind = (session: Exercise[], kind: Exercise['kind']) => session.filter((e) => e.kind === kind);

describe('helpers', () => {
  it('primaryMeaning takes the text before the first semicolon', () => {
    expect(primaryMeaning(words.get('w:我')!)).toBe('I');
    expect(primaryMeaning(words.get('w:老师')!)).toBe('teacher');
  });
  it('tokensOf maps word ids to simplified forms', () => {
    expect(tokensOf(fixtureUnit1.sentences[1]!, words)).toEqual(['我', '不', '是', '他']);
  });
});

describe('generateSession', () => {
  const session = generateSession(input, 123);

  it('is deterministic for a seed and has SESSION_SIZE exercises with unique ids', () => {
    expect(generateSession(input, 123)).toEqual(session);
    expect(generateSession(input, 124)).not.toEqual(session);
    expect(session).toHaveLength(SESSION_SIZE);
    expect(new Set(session.map((e) => e.id)).size).toBe(SESSION_SIZE);
  });

  it('starts with a multiple-choice exercise and mixes every kind except listen-pick without audio', () => {
    expect(session[0]?.kind).toBe('multiple-choice');
    expect(byKind(session, 'fill-blank')).toHaveLength(1);
    expect(byKind(session, 'sentence-builder')).toHaveLength(2);
    expect(byKind(session, 'match-pairs')).toHaveLength(1);
    expect(byKind(session, 'listen-pick')).toHaveLength(0);
    expect(byKind(session, 'multiple-choice')).toHaveLength(11);
  });

  it('adds three listen-pick exercises when audio is available', () => {
    const withAudio = generateSession({ ...input, audio: true }, 5);
    expect(withAudio).toHaveLength(SESSION_SIZE);
    expect(byKind(withAudio, 'listen-pick')).toHaveLength(3);
    for (const e of byKind(withAudio, 'listen-pick')) {
      if (e.kind !== 'listen-pick') continue;
      expect(e.options[e.correctIndex]).toBe(words.get(e.wordId)?.simplified);
      expect(new Set(e.options).size).toBe(4);
    }
  });

  it('builds four distinct options with the right answer in place for every choice exercise', () => {
    for (const e of session) {
      if (e.kind === 'multiple-choice') {
        const w = words.get(e.wordId)!;
        expect(e.options).toHaveLength(4);
        expect(new Set(e.options).size).toBe(4);
        const expected = e.direction === 'zh-en' ? primaryMeaning(w) : w.simplified;
        expect(e.options[e.correctIndex]).toBe(expected);
        if (e.direction === 'zh-en') {
          expect(e.prompt).toBe(w.simplified);
          expect(e.promptSub).toBe(w.pinyin);
          expect(e.speech).toBe(w.simplified);
        } else if (e.direction === 'en-zh') {
          expect(e.prompt).toBe(primaryMeaning(w));
          expect(e.speech).toBeNull();
        } else {
          expect(e.prompt).toBe(w.pinyin);
        }
      }
      if (e.kind === 'fill-blank') {
        expect(e.options).toHaveLength(4);
        expect(e.options[e.correctIndex]).toBe(e.tokens[e.blankIndex]);
        expect(e.grammarId).toBe('g:bu-negation');
      }
    }
  });

  it('gives sentence builders the sentence tokens plus two distractor tiles', () => {
    for (const e of byKind(session, 'sentence-builder')) {
      if (e.kind !== 'sentence-builder') continue;
      const sentence = fixtureUnit1.sentences.find((s) => s.id === e.sentenceId)!;
      expect(e.answer).toEqual(tokensOf(sentence, words));
      expect(e.tiles).toHaveLength(e.answer.length + 2);
      for (const t of e.answer) expect(e.tiles).toContain(t);
      expect(e.en).toBe(sentence.en);
      expect(e.speech).toBe(sentence.zh);
    }
  });

  it('pairs five unit words with distinct meanings', () => {
    const [pairs] = byKind(session, 'match-pairs');
    if (pairs?.kind !== 'match-pairs') throw new Error('expected match-pairs');
    expect(pairs.pairs).toHaveLength(5);
    expect(new Set(pairs.pairs.map((p) => p.en)).size).toBe(5);
    for (const p of pairs.pairs) expect(fixtureUnit1.unit.wordIds).toContain(p.wordId);
  });

  it('uses only multiple choice when the unit has no sentences and too few words for pairs', () => {
    const tiny: SessionInput = {
      ...input,
      chunk: {
        unit: { ...fixtureUnit1.unit, wordIds: ['w:我', 'w:你'], grammarIds: [], sentenceIds: [] },
        grammar: [],
        sentences: [],
      },
    };
    const s = generateSession(tiny, 1);
    expect(s.every((e) => e.kind === 'multiple-choice')).toBe(true);
    expect(s).toHaveLength(6); // 2 words x 3 directions
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @hi-chinese/web test -- exercises`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/exercises/random.ts`:

```ts
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so sessions are reproducible from a seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function pick<T>(items: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, n);
}

export function randomInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive);
}
```

`apps/web/src/exercises/types.ts`:

```ts
export type ChoiceDirection = 'zh-en' | 'en-zh' | 'pinyin-zh';

export interface MultipleChoiceExercise {
  kind: 'multiple-choice';
  id: string;
  wordId: string;
  direction: ChoiceDirection;
  prompt: string;
  promptSub: string | null;
  /** Text to speak when the prompt is Chinese; null when audio would give the answer away. */
  speech: string | null;
  options: string[];
  correctIndex: number;
}

export interface ListenPickExercise {
  kind: 'listen-pick';
  id: string;
  wordId: string;
  speech: string;
  options: string[];
  correctIndex: number;
}

export interface MatchPairsExercise {
  kind: 'match-pairs';
  id: string;
  pairs: { wordId: string; zh: string; en: string }[];
}

export interface SentenceBuilderExercise {
  kind: 'sentence-builder';
  id: string;
  sentenceId: string;
  en: string;
  speech: string;
  answer: string[];
  /** Shuffled: the answer tokens plus two distractors. */
  tiles: string[];
}

export interface FillBlankExercise {
  kind: 'fill-blank';
  id: string;
  sentenceId: string;
  grammarId: string | null;
  tokens: string[];
  blankIndex: number;
  en: string;
  options: string[];
  correctIndex: number;
}

export type Exercise =
  | MultipleChoiceExercise
  | ListenPickExercise
  | MatchPairsExercise
  | SentenceBuilderExercise
  | FillBlankExercise;

export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'order'; tiles: string[] }
  | { kind: 'pairs'; mismatches: number };

export function checkAnswer(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      return answer.kind === 'choice' && answer.index === exercise.correctIndex;
    case 'sentence-builder':
      return (
        answer.kind === 'order' &&
        answer.tiles.length === exercise.answer.length &&
        answer.tiles.every((t, i) => t === exercise.answer[i])
      );
    case 'match-pairs':
      return answer.kind === 'pairs' && answer.mismatches === 0;
  }
}

export function correctAnswerText(exercise: Exercise): string {
  switch (exercise.kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      return exercise.options[exercise.correctIndex] ?? '';
    case 'sentence-builder':
      return exercise.answer.join('');
    case 'match-pairs':
      return exercise.pairs.map((p) => `${p.zh} = ${p.en}`).join(', ');
  }
}
```

`apps/web/src/exercises/generate.ts`:

```ts
import type { GrammarPoint, Sentence, UnitChunk, Word } from '@hi-chinese/content';
import { mulberry32, pick, randomInt, shuffle, type Rng } from './random.js';
import type {
  ChoiceDirection,
  Exercise,
  FillBlankExercise,
  ListenPickExercise,
  MatchPairsExercise,
  MultipleChoiceExercise,
  SentenceBuilderExercise,
} from './types.js';

export const SESSION_SIZE = 15;

export interface SessionInput {
  chunk: UnitChunk;
  words: ReadonlyMap<string, Word>;
  /** Every word id of the unit's HSK level; distractors come from the unit first, then the level. */
  levelWordIds: readonly string[];
  /** False when no Chinese voice exists: listen-and-pick exercises are then skipped. */
  audio: boolean;
}

export function primaryMeaning(word: Word): string {
  const first = word.meanings[0] ?? word.simplified;
  const head = (first.split(';')[0] ?? first).trim();
  return head.length > 0 ? head : first.trim();
}

export function tokensOf(sentence: Sentence, words: ReadonlyMap<string, Word>): string[] {
  return sentence.wordIds.map((id) => words.get(id)?.simplified ?? id.replace(/^w:/, ''));
}

type IdGen = (kind: string) => string;

/** Candidate distractor words: the unit's words (shuffled) first, then the rest of the level. */
function candidates(input: SessionInput, exclude: ReadonlySet<string>, rng: Rng): Word[] {
  const unitIds = new Set(input.chunk.unit.wordIds);
  const ordered = [
    ...shuffle(input.chunk.unit.wordIds, rng),
    ...shuffle(input.levelWordIds.filter((id) => !unitIds.has(id)), rng),
  ];
  const out: Word[] = [];
  for (const id of ordered) {
    if (exclude.has(id)) continue;
    const w = input.words.get(id);
    if (w) out.push(w);
  }
  return out;
}

function distinctTexts(
  pool: readonly Word[],
  render: (w: Word) => string,
  taken: ReadonlySet<string>,
  n: number,
  accept: (w: Word) => boolean = () => true,
): string[] {
  const seen = new Set(taken);
  const out: string[] = [];
  for (const w of pool) {
    if (!accept(w)) continue;
    const text = render(w);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length === n) break;
  }
  return out;
}

function withCorrect(correct: string, distractors: string[], rng: Rng): { options: string[]; correctIndex: number } {
  const correctIndex = randomInt(distractors.length + 1, rng);
  const options = [...distractors];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

function multipleChoice(
  word: Word,
  direction: ChoiceDirection,
  input: SessionInput,
  rng: Rng,
  id: IdGen,
): MultipleChoiceExercise {
  const pool = candidates(input, new Set([word.id]), rng);
  if (direction === 'zh-en') {
    const correct = primaryMeaning(word);
    const { options, correctIndex } = withCorrect(
      correct,
      distinctTexts(pool, primaryMeaning, new Set([correct]), 3),
      rng,
    );
    return {
      kind: 'multiple-choice',
      id: id('mc'),
      wordId: word.id,
      direction,
      prompt: word.simplified,
      promptSub: word.pinyin,
      speech: word.simplified,
      options,
      correctIndex,
    };
  }
  const correct = word.simplified;
  // Homophones would make a pinyin prompt ambiguous, so they are never distractors.
  const notHomophone = (w: Word) => w.pinyin !== word.pinyin;
  const { options, correctIndex } = withCorrect(
    correct,
    distinctTexts(pool, (w) => w.simplified, new Set([correct]), 3, notHomophone),
    rng,
  );
  return {
    kind: 'multiple-choice',
    id: id('mc'),
    wordId: word.id,
    direction,
    prompt: direction === 'en-zh' ? primaryMeaning(word) : word.pinyin,
    promptSub: null,
    speech: null,
    options,
    correctIndex,
  };
}

function listenPick(word: Word, input: SessionInput, rng: Rng, id: IdGen): ListenPickExercise {
  const pool = candidates(input, new Set([word.id]), rng);
  const { options, correctIndex } = withCorrect(
    word.simplified,
    distinctTexts(pool, (w) => w.simplified, new Set([word.simplified]), 3, (w) => w.pinyin !== word.pinyin),
    rng,
  );
  return { kind: 'listen-pick', id: id('lp'), wordId: word.id, speech: word.simplified, options, correctIndex };
}

function matchPairs(unitWords: readonly Word[], rng: Rng, id: IdGen): MatchPairsExercise | null {
  const seen = new Set<string>();
  const pairs: MatchPairsExercise['pairs'] = [];
  for (const w of shuffle(unitWords, rng)) {
    const en = primaryMeaning(w);
    if (seen.has(en) || seen.has(w.simplified)) continue;
    seen.add(en);
    seen.add(w.simplified);
    pairs.push({ wordId: w.id, zh: w.simplified, en });
    if (pairs.length === 5) break;
  }
  return pairs.length === 5 ? { kind: 'match-pairs', id: id('mp'), pairs } : null;
}

function sentenceBuilder(sentence: Sentence, input: SessionInput, rng: Rng, id: IdGen): SentenceBuilderExercise {
  const answer = tokensOf(sentence, input.words);
  const pool = candidates(input, new Set(sentence.wordIds), rng);
  const distractors = distinctTexts(pool, (w) => w.simplified, new Set(answer), 2);
  return {
    kind: 'sentence-builder',
    id: id('sb'),
    sentenceId: sentence.id,
    en: sentence.en,
    speech: sentence.zh,
    answer,
    tiles: shuffle([...answer, ...distractors], rng),
  };
}

function fillBlank(
  sentence: Sentence,
  grammar: GrammarPoint | null,
  input: SessionInput,
  rng: Rng,
  id: IdGen,
): FillBlankExercise | null {
  const tokens = tokensOf(sentence, input.words);
  if (tokens.length < 2) return null;
  const unitIds = new Set(input.chunk.unit.wordIds);
  const preferred = sentence.wordIds.flatMap((wid, i) => (unitIds.has(wid) ? [i] : []));
  const positions = preferred.length > 0 ? preferred : tokens.map((_, i) => i);
  const blankIndex = positions[randomInt(positions.length, rng)]!;
  const correct = tokens[blankIndex]!;
  const pool = candidates(input, new Set(sentence.wordIds), rng);
  const { options, correctIndex } = withCorrect(
    correct,
    distinctTexts(pool, (w) => w.simplified, new Set(tokens), 3),
    rng,
  );
  return {
    kind: 'fill-blank',
    id: id('fb'),
    sentenceId: sentence.id,
    grammarId: grammar?.id ?? null,
    tokens,
    blankIndex,
    en: sentence.en,
    options,
    correctIndex,
  };
}

/**
 * Spec §4: about 15 exercises from the unit's words, sentences and grammar.
 * Fill-the-blank per grammar point (max 2), up to 2 sentence builders, one
 * match-pairs, three listen-and-pick when audio works, and multiple choice for
 * the rest. Wrong answers are re-queued by the session reducer, not here.
 */
export function generateSession(input: SessionInput, seed: number): Exercise[] {
  const rng = mulberry32(seed);
  const { chunk, words } = input;
  const unitWords = chunk.unit.wordIds.flatMap((wid) => {
    const w = words.get(wid);
    return w ? [w] : [];
  });
  let counter = 0;
  const id: IdGen = (kind) => `${kind}:${++counter}`;
  const special: Exercise[] = [];

  const usedSentences = new Set<string>();
  for (const g of chunk.grammar.slice(0, 2)) {
    const sentence = g.sentenceIds
      .map((sid) => chunk.sentences.find((s) => s.id === sid))
      .find((s): s is Sentence => s !== undefined && s.wordIds.length >= 2);
    if (!sentence) continue;
    const ex = fillBlank(sentence, g, input, rng, id);
    if (ex) {
      special.push(ex);
      usedSentences.add(sentence.id);
    }
  }

  const builderSentences = shuffle(
    chunk.sentences.filter((s) => s.wordIds.length >= 3),
    rng,
  )
    .sort((a, b) => Number(usedSentences.has(a.id)) - Number(usedSentences.has(b.id)))
    .slice(0, 2);
  for (const s of builderSentences) special.push(sentenceBuilder(s, input, rng, id));

  const pairs = matchPairs(unitWords, rng, id);
  if (pairs) special.push(pairs);

  if (input.audio) for (const w of pick(unitWords, 3, rng)) special.push(listenPick(w, input, rng, id));

  const directions: ChoiceDirection[] = ['zh-en', 'en-zh', 'pinyin-zh'];
  const order = shuffle(unitWords, rng);
  const choices: Exercise[] = [];
  for (let round = 0; round < directions.length; round++) {
    for (let i = 0; i < order.length; i++) {
      if (special.length + choices.length >= SESSION_SIZE) break;
      choices.push(multipleChoice(order[i]!, directions[(i + round) % directions.length]!, input, rng, id));
    }
  }

  const session = shuffle([...special, ...choices], rng);
  const firstChoice = session.findIndex((e) => e.kind === 'multiple-choice');
  if (firstChoice > 0) {
    const [mc] = session.splice(firstChoice, 1);
    session.unshift(mc!);
  }
  return session;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- exercises` — Expected: 17 passed. If the determinism test's `not.toEqual` for seeds 123/124 fails, change 124 to 125 (two seeds producing the identical session is astronomically unlikely but not impossible).
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/exercises apps/web/test/exercises
git commit -m "feat(web): exercise types and seeded session generator"
```

---

### Task 9: Session reducer (pure)

**Files:**
- Create: `apps/web/src/exercises/session.ts`
- Test: `apps/web/test/exercises/session.test.ts`

**Interfaces:**
- Consumes: `Exercise`, `Answer`, `checkAnswer` (Task 8).
- Produces:

```ts
export interface SessionState {
  queue: Exercise[];            // grows when wrong answers are re-queued
  position: number;             // index into queue
  phase: 'question' | 'feedback' | 'done';
  lastCorrect: boolean | null;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  skipped: number;
}
export type SessionAction = { type: 'answer'; answer: Answer } | { type: 'next' } | { type: 'skip' };
export function createSession(exercises: readonly Exercise[]): SessionState;
export function sessionReducer(state: SessionState, action: SessionAction): SessionState;
export function currentExercise(state: SessionState): Exercise | null;
export function sessionProgress(state: SessionState): number;     // 0..1 = position / queue.length
export function accuracy(state: SessionState): number;            // correct / answered, 0 when nothing answered
```

- [ ] **Step 1: Write the failing test**

`apps/web/test/exercises/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  accuracy,
  createSession,
  currentExercise,
  sessionProgress,
  sessionReducer,
  type SessionState,
} from '../../src/exercises/session.js';
import type { Exercise } from '../../src/exercises/types.js';

const mc = (id: string): Exercise => ({
  kind: 'multiple-choice',
  id,
  wordId: 'w:我',
  direction: 'en-zh',
  prompt: 'I',
  promptSub: null,
  speech: null,
  options: ['我', '你', '他', '好'],
  correctIndex: 0,
});

const right = { type: 'answer', answer: { kind: 'choice', index: 0 } } as const;
const wrong = { type: 'answer', answer: { kind: 'choice', index: 2 } } as const;
const next = { type: 'next' } as const;

function run(state: SessionState, ...actions: Parameters<typeof sessionReducer>[1][]): SessionState {
  return actions.reduce(sessionReducer, state);
}

describe('session reducer', () => {
  it('starts on the first question, or done for an empty session', () => {
    const s = createSession([mc('a'), mc('b')]);
    expect(s.phase).toBe('question');
    expect(currentExercise(s)?.id).toBe('a');
    expect(sessionProgress(s)).toBe(0);
    expect(createSession([]).phase).toBe('done');
    expect(currentExercise(createSession([]))).toBeNull();
  });

  it('shows feedback after an answer and advances on next', () => {
    const s1 = run(createSession([mc('a'), mc('b')]), right);
    expect(s1.phase).toBe('feedback');
    expect(s1.lastCorrect).toBe(true);
    expect(s1.streak).toBe(1);
    expect(s1.correct).toBe(1);
    expect(s1.answered).toBe(1);
    const s2 = run(s1, next);
    expect(s2.phase).toBe('question');
    expect(currentExercise(s2)?.id).toBe('b');
    expect(sessionProgress(s2)).toBe(0.5);
  });

  it('re-queues a wrong answer at the end and resets the streak', () => {
    const s = run(createSession([mc('a'), mc('b')]), right, next, wrong);
    expect(s.lastCorrect).toBe(false);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(1);
    expect(s.queue.map((e) => e.id)).toEqual(['a', 'b', 'b']);
    const s2 = run(s, next);
    expect(s2.phase).toBe('question');
    expect(currentExercise(s2)?.id).toBe('b');
    const s3 = run(s2, right, next);
    expect(s3.phase).toBe('done');
    expect(accuracy(s3)).toBeCloseTo(2 / 3);
  });

  it('finishes after the last answer', () => {
    const s = run(createSession([mc('a')]), right, next);
    expect(s.phase).toBe('done');
    expect(sessionProgress(s)).toBe(1);
    expect(accuracy(s)).toBe(1);
  });

  it('ignores answers during feedback and next during a question', () => {
    const start = createSession([mc('a'), mc('b')]);
    expect(run(start, next)).toEqual(start);
    const fb = run(start, right);
    expect(run(fb, wrong)).toEqual(fb);
  });

  it('skip drops the current exercise without counting it', () => {
    const s = run(createSession([mc('a'), mc('b')]), { type: 'skip' });
    expect(s.queue.map((e) => e.id)).toEqual(['b']);
    expect(s.position).toBe(0);
    expect(s.phase).toBe('question');
    expect(s.skipped).toBe(1);
    expect(s.answered).toBe(0);
    const done = run(s, { type: 'skip' });
    expect(done.phase).toBe('done');
    expect(accuracy(done)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @hi-chinese/web test -- session`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`apps/web/src/exercises/session.ts`:

```ts
import { checkAnswer, type Answer, type Exercise } from './types.js';

export interface SessionState {
  queue: Exercise[];
  position: number;
  phase: 'question' | 'feedback' | 'done';
  lastCorrect: boolean | null;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  skipped: number;
}

export type SessionAction = { type: 'answer'; answer: Answer } | { type: 'next' } | { type: 'skip' };

export function createSession(exercises: readonly Exercise[]): SessionState {
  return {
    queue: [...exercises],
    position: 0,
    phase: exercises.length === 0 ? 'done' : 'question',
    lastCorrect: null,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    correct: 0,
    skipped: 0,
  };
}

export function currentExercise(state: SessionState): Exercise | null {
  return state.phase === 'done' ? null : (state.queue[state.position] ?? null);
}

export function sessionProgress(state: SessionState): number {
  return state.queue.length === 0 ? 1 : Math.min(1, state.position / state.queue.length);
}

export function accuracy(state: SessionState): number {
  return state.answered === 0 ? 0 : state.correct / state.answered;
}

/**
 * Spec §4 session rules: wrong answers go to the end of the queue; a streak
 * counts consecutive correct answers. `skip` is for a broken exercise (error
 * boundary): it is removed and never counted.
 */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const current = currentExercise(state);
  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'question' || !current) return state;
      const ok = checkAnswer(current, action.answer);
      const streak = ok ? state.streak + 1 : 0;
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: ok,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        answered: state.answered + 1,
        correct: state.correct + (ok ? 1 : 0),
        queue: ok ? state.queue : [...state.queue, current],
      };
    }
    case 'next': {
      if (state.phase !== 'feedback') return state;
      const position = state.position + 1;
      return { ...state, position, phase: position >= state.queue.length ? 'done' : 'question' };
    }
    case 'skip': {
      if (state.phase === 'done' || !current) return state;
      const queue = state.queue.filter((_, i) => i !== state.position);
      return {
        ...state,
        queue,
        skipped: state.skipped + 1,
        lastCorrect: null,
        phase: state.position >= queue.length ? 'done' : 'question',
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @hi-chinese/web test -- session` — Expected: 6 passed.
Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/exercises/session.ts apps/web/test/exercises/session.test.ts
git commit -m "feat(web): practice session reducer with re-queue and streaks"
```

---

### Task 10: Exercise components, practice session screen, results

**Files:**
- Create: `apps/web/src/exercises/dev-attrs.ts`, `apps/web/src/exercises/components/ChoiceList.tsx`, `MultipleChoice.tsx`, `ListenPick.tsx`, `FillBlank.tsx`, `SentenceBuilder.tsx`, `MatchPairs.tsx`, `ExerciseView.tsx`, `ExerciseBoundary.tsx`, `apps/web/src/practice/PracticeScreen.tsx`
- Modify: `apps/web/src/router.tsx` (practiceRoute component → `PracticeScreen`, delete `StepPending`)
- Test: `apps/web/test/exercises/components.test.tsx`

**Interfaces:**
- Consumes: Tasks 7–9 (`SpeakButton`, `speak`, `useHasChineseVoice`, `generateSession`, `sessionReducer`, `createSession`, `currentExercise`, `sessionProgress`, `accuracy`, `checkAnswer`, `correctAnswerText`), Task 5 (`useContent`, `useUnitChunk`), Task 3 (`completeUnit`, `db`), Task 4 (`requestSync`), `uniqueHanChars` from `@hi-chinese/content`.
- Produces:

```ts
export function devAttr(name: string, value: string | number | boolean): Record<string, string>;   // {} outside import.meta.env.DEV
export interface ExerciseProps<E extends Exercise> { exercise: E; answered: Answer | null; onAnswer: (answer: Answer) => void }
export function ChoiceList(props: { options: string[]; correctIndex: number; answered: Answer | null; onAnswer: (a: Answer) => void; large?: boolean }): JSX.Element;
export function MultipleChoice(props: ExerciseProps<MultipleChoiceExercise>): JSX.Element;
export function ListenPick(props: ExerciseProps<ListenPickExercise>): JSX.Element;
export function FillBlank(props: ExerciseProps<FillBlankExercise>): JSX.Element;
export function SentenceBuilder(props: ExerciseProps<SentenceBuilderExercise>): JSX.Element;
export function MatchPairs(props: ExerciseProps<MatchPairsExercise>): JSX.Element;
export function ExerciseView(props: ExerciseProps<Exercise>): JSX.Element;        // <div data-testid="exercise" data-kind=...>
export class ExerciseBoundary extends Component<{ onError: () => void; children: ReactNode }>;
export function PracticeScreen(): JSX.Element;
```

Markup contract used by the end-to-end test (DEV builds only):
- Choice buttons: `data-correct="true"|"false"`.
- Sentence builder bank tiles: `data-answer-index="<position in answer>"` on the tiles that belong to the answer (duplicate tokens map to distinct positions); a `Check` button submits.
- Match pairs: left buttons `data-pair-left="<i>"`, right buttons `data-pair-right="<i>"` where `i` is the index into `exercise.pairs`.
- The feedback bar has a `Continue` button; the results view has `data-testid="results"` and a `Back to path` link.

- [ ] **Step 1: Write the failing component tests**

`apps/web/test/exercises/components.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MatchPairs } from '../../src/exercises/components/MatchPairs.js';
import { MultipleChoice } from '../../src/exercises/components/MultipleChoice.js';
import { SentenceBuilder } from '../../src/exercises/components/SentenceBuilder.js';
import { ExerciseBoundary } from '../../src/exercises/components/ExerciseBoundary.js';
import type { Answer, MatchPairsExercise, MultipleChoiceExercise, SentenceBuilderExercise } from '../../src/exercises/types.js';

const mc: MultipleChoiceExercise = {
  kind: 'multiple-choice',
  id: 'mc:1',
  wordId: 'w:我',
  direction: 'en-zh',
  prompt: 'I',
  promptSub: null,
  speech: null,
  options: ['你', '我', '他', '好'],
  correctIndex: 1,
};

const sb: SentenceBuilderExercise = {
  kind: 'sentence-builder',
  id: 'sb:1',
  sentenceId: 's:l1:002',
  en: 'I am not him.',
  speech: '我不是他。',
  answer: ['我', '不', '是', '他'],
  tiles: ['他', '我', '好', '不', '是', '你'],
};

const mp: MatchPairsExercise = {
  kind: 'match-pairs',
  id: 'mp:1',
  pairs: [
    { wordId: 'w:我', zh: '我', en: 'I' },
    { wordId: 'w:你', zh: '你', en: 'you' },
    { wordId: 'w:他', zh: '他', en: 'he' },
  ],
};

describe('MultipleChoice', () => {
  it('reports the chosen index and marks the correct option for dev tooling', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MultipleChoice exercise={mc} answered={null} onAnswer={onAnswer} />);
    expect(screen.getByText('I')).toBeTruthy();
    const correct = screen.getByRole('button', { name: '我' });
    expect(correct.getAttribute('data-correct')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '他' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'choice', index: 2 });
  });

  it('disables the options once answered', () => {
    render(<MultipleChoice exercise={mc} answered={{ kind: 'choice', index: 2 }} onAnswer={() => {}} />);
    for (const b of screen.getAllByRole('button')) expect(b).toHaveProperty('disabled', true);
  });
});

describe('SentenceBuilder', () => {
  it('builds the answer from tapped tiles and submits on Check', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<SentenceBuilder exercise={sb} answered={null} onAnswer={onAnswer} />);
    const bank = screen.getByTestId('tile-bank');
    for (let i = 0; i < sb.answer.length; i++) {
      fireEvent.click(bank.querySelector(`[data-answer-index="${i}"]`)!);
    }
    expect(within(screen.getByTestId('tile-answer')).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '我',
      '不',
      '是',
      '他',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'order', tiles: ['我', '不', '是', '他'] });
  });

  it('returns a placed tile to the bank when tapped again', () => {
    render(<SentenceBuilder exercise={sb} answered={null} onAnswer={() => {}} />);
    const bank = screen.getByTestId('tile-bank');
    fireEvent.click(within(bank).getByRole('button', { name: '好' }));
    expect(within(screen.getByTestId('tile-answer')).getByRole('button', { name: '好' })).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('tile-answer')).getByRole('button', { name: '好' }));
    expect(within(screen.getByTestId('tile-answer')).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Check' })).toHaveProperty('disabled', true);
  });
});

describe('MatchPairs', () => {
  it('finishes with zero mismatches when every pair is matched correctly', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MatchPairs exercise={mp} answered={null} onAnswer={onAnswer} />);
    for (let i = 0; i < mp.pairs.length; i++) {
      fireEvent.click(screen.getByTestId('exercise-pairs').querySelector(`[data-pair-left="${i}"]`)!);
      fireEvent.click(screen.getByTestId('exercise-pairs').querySelector(`[data-pair-right="${i}"]`)!);
    }
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'pairs', mismatches: 0 });
  });

  it('counts a mismatch and lets the learner continue', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MatchPairs exercise={mp} answered={null} onAnswer={onAnswer} />);
    const root = screen.getByTestId('exercise-pairs');
    fireEvent.click(root.querySelector('[data-pair-left="0"]')!);
    fireEvent.click(root.querySelector('[data-pair-right="1"]')!); // wrong
    for (let i = 0; i < mp.pairs.length; i++) {
      fireEvent.click(root.querySelector(`[data-pair-left="${i}"]`)!);
      fireEvent.click(root.querySelector(`[data-pair-right="${i}"]`)!);
    }
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'pairs', mismatches: 1 });
  });
});

describe('ExerciseBoundary', () => {
  it('calls onError and renders nothing when a child throws', () => {
    const Boom = () => {
      throw new Error('bad exercise');
    };
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ExerciseBoundary onError={onError}>
        <Boom />
      </ExerciseBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('');
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @hi-chinese/web test -- components`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the components**

`apps/web/src/exercises/dev-attrs.ts`:

```ts
/**
 * Data attributes that exist only in development builds so the end-to-end test
 * can solve exercises. `import.meta.env.DEV` is false in `vite build`, so
 * production markup carries none of them.
 */
export function devAttr(name: string, value: string | number | boolean): Record<string, string> {
  return import.meta.env.DEV ? { [name]: String(value) } : {};
}
```

`apps/web/src/exercises/components/ChoiceList.tsx`:

```tsx
import { devAttr } from '../dev-attrs.js';
import type { Answer } from '../types.js';

export function ChoiceList({
  options,
  correctIndex,
  answered,
  onAnswer,
  large = false,
}: {
  options: string[];
  correctIndex: number;
  answered: Answer | null;
  onAnswer: (a: Answer) => void;
  large?: boolean;
}) {
  const chosen = answered?.kind === 'choice' ? answered.index : null;
  return (
    <ul className="grid grid-cols-1 gap-2">
      {options.map((opt, i) => {
        let tone = 'border-stone-300 bg-white';
        if (answered !== null) {
          if (i === correctIndex) tone = 'border-green-500 bg-green-50';
          else if (i === chosen) tone = 'border-red-500 bg-red-50';
          else tone = 'border-stone-200 bg-stone-50 opacity-60';
        }
        return (
          <li key={`${i}:${opt}`}>
            <button
              type="button"
              disabled={answered !== null}
              onClick={() => onAnswer({ kind: 'choice', index: i })}
              className={`w-full rounded-lg border px-4 py-3 text-left ${large ? 'text-2xl' : 'text-base'} ${tone}`}
              {...devAttr('data-correct', i === correctIndex)}
            >
              {opt}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

`apps/web/src/exercises/components/MultipleChoice.tsx`:

```tsx
import { SpeakButton } from '../../audio/SpeakButton.js';
import type { Answer, MultipleChoiceExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';

export interface ExerciseProps<E> {
  exercise: E;
  answered: Answer | null;
  onAnswer: (answer: Answer) => void;
}

const TITLES = {
  'zh-en': 'What does this mean?',
  'en-zh': 'Pick the Chinese',
  'pinyin-zh': 'Which word sounds like this?',
} as const;

export function MultipleChoice({ exercise, answered, onAnswer }: ExerciseProps<MultipleChoiceExercise>) {
  const zhOptions = exercise.direction !== 'zh-en';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">{TITLES[exercise.direction]}</p>
      <div className="flex items-center gap-3">
        <div>
          <p className={exercise.direction === 'zh-en' ? 'text-4xl' : 'text-2xl'}>{exercise.prompt}</p>
          {exercise.promptSub && <p className="text-stone-600">{exercise.promptSub}</p>}
        </div>
        {exercise.speech && <SpeakButton text={exercise.speech} />}
      </div>
      <ChoiceList
        options={exercise.options}
        correctIndex={exercise.correctIndex}
        answered={answered}
        onAnswer={onAnswer}
        large={zhOptions}
      />
    </div>
  );
}
```

`apps/web/src/exercises/components/ListenPick.tsx`:

```tsx
import { useEffect } from 'react';
import { SpeakButton } from '../../audio/SpeakButton.js';
import { speak } from '../../audio/speech.js';
import type { ListenPickExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function ListenPick({ exercise, answered, onAnswer }: ExerciseProps<ListenPickExercise>) {
  useEffect(() => {
    speak(exercise.speech);
  }, [exercise.speech]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Listen and pick what you heard</p>
      <div className="flex justify-center py-2">
        <SpeakButton text={exercise.speech} label="Play audio" size="lg" />
      </div>
      <ChoiceList
        options={exercise.options}
        correctIndex={exercise.correctIndex}
        answered={answered}
        onAnswer={onAnswer}
        large
      />
    </div>
  );
}
```

`apps/web/src/exercises/components/FillBlank.tsx`:

```tsx
import type { FillBlankExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function FillBlank({ exercise, answered, onAnswer }: ExerciseProps<FillBlankExercise>) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Fill in the blank</p>
      <p className="text-2xl leading-relaxed">
        {exercise.tokens.map((t, i) =>
          i === exercise.blankIndex ? (
            <span key={i} className="mx-1 inline-block min-w-12 border-b-2 border-stone-400 text-center">
              {answered !== null ? exercise.options[exercise.correctIndex] : ' '}
            </span>
          ) : (
            <span key={i}>{t}</span>
          ),
        )}
      </p>
      <p className="text-stone-600">{exercise.en}</p>
      <ChoiceList
        options={exercise.options}
        correctIndex={exercise.correctIndex}
        answered={answered}
        onAnswer={onAnswer}
        large
      />
    </div>
  );
}
```

`apps/web/src/exercises/components/SentenceBuilder.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { devAttr } from '../dev-attrs.js';
import type { SentenceBuilderExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

/** Maps each tile index to the answer position it can fill (duplicates get distinct positions). */
function answerPositions(tiles: readonly string[], answer: readonly string[]): Map<number, number> {
  const map = new Map<number, number>();
  const used = new Set<number>();
  answer.forEach((token, pos) => {
    const tileIndex = tiles.findIndex((t, i) => t === token && !used.has(i));
    if (tileIndex >= 0) {
      used.add(tileIndex);
      map.set(tileIndex, pos);
    }
  });
  return map;
}

export function SentenceBuilder({ exercise, answered, onAnswer }: ExerciseProps<SentenceBuilderExercise>) {
  const [placed, setPlaced] = useState<number[]>([]);
  const positions = useMemo(() => answerPositions(exercise.tiles, exercise.answer), [exercise]);
  const locked = answered !== null;
  const placedSet = new Set(placed);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Build the sentence</p>
      <p className="text-lg text-stone-800">{exercise.en}</p>
      <div
        data-testid="tile-answer"
        className="flex min-h-14 flex-wrap gap-2 rounded-lg border-2 border-dashed border-stone-300 p-2"
      >
        {placed.map((tileIndex) => (
          <button
            key={tileIndex}
            type="button"
            disabled={locked}
            onClick={() => setPlaced((p) => p.filter((i) => i !== tileIndex))}
            className="rounded-md bg-red-700 px-3 py-2 text-xl text-white"
          >
            {exercise.tiles[tileIndex]}
          </button>
        ))}
      </div>
      <div data-testid="tile-bank" className="flex flex-wrap gap-2">
        {exercise.tiles.map((tile, i) =>
          placedSet.has(i) ? (
            <span key={i} className="invisible rounded-md border px-3 py-2 text-xl">
              {tile}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => setPlaced((p) => [...p, i])}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xl"
              {...(positions.has(i) ? devAttr('data-answer-index', positions.get(i)!) : {})}
            >
              {tile}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        disabled={locked || placed.length === 0}
        onClick={() => onAnswer({ kind: 'order', tiles: placed.map((i) => exercise.tiles[i]!) })}
        className="rounded-lg bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        Check
      </button>
    </div>
  );
}
```

`apps/web/src/exercises/components/MatchPairs.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { devAttr } from '../dev-attrs.js';
import { mulberry32, shuffle } from '../random.js';
import type { MatchPairsExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function MatchPairs({ exercise, answered, onAnswer }: ExerciseProps<MatchPairsExercise>) {
  // Right column order is fixed per exercise id so re-renders never reshuffle it.
  const rightOrder = useMemo(() => {
    let seed = 0;
    for (const ch of exercise.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    return shuffle(exercise.pairs.map((_, i) => i), mulberry32(seed));
  }, [exercise]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [mismatches, setMismatches] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const done = matched.size === exercise.pairs.length;

  useEffect(() => {
    if (done && answered === null) onAnswer({ kind: 'pairs', mismatches });
    // onAnswer changes identity per render; firing once per completion is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function pickRight(i: number): void {
    if (selectedLeft === null || matched.has(i)) return;
    if (i === selectedLeft) {
      setMatched((m) => new Set(m).add(i));
    } else {
      setMismatches((n) => n + 1);
      setShake(i);
      setTimeout(() => setShake(null), 300);
    }
    setSelectedLeft(null);
  }

  const base = 'w-full rounded-lg border px-3 py-3 text-left disabled:opacity-40';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Match the pairs</p>
      <div data-testid="exercise-pairs" className="grid grid-cols-2 gap-2">
        <ul className="flex flex-col gap-2">
          {exercise.pairs.map((p, i) => (
            <li key={p.wordId}>
              <button
                type="button"
                disabled={matched.has(i) || answered !== null}
                onClick={() => setSelectedLeft(i)}
                className={`${base} text-2xl ${selectedLeft === i ? 'border-red-600 bg-red-50' : 'border-stone-300 bg-white'}`}
                {...devAttr('data-pair-left', i)}
              >
                {p.zh}
              </button>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2">
          {rightOrder.map((i) => (
            <li key={exercise.pairs[i]!.wordId}>
              <button
                type="button"
                disabled={matched.has(i) || answered !== null}
                onClick={() => pickRight(i)}
                className={`${base} ${shake === i ? 'border-red-500 bg-red-50' : 'border-stone-300 bg-white'}`}
                {...devAttr('data-pair-right', i)}
              >
                {exercise.pairs[i]!.en}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

`apps/web/src/exercises/components/ExerciseView.tsx`:

```tsx
import type { Exercise } from '../types.js';
import { FillBlank } from './FillBlank.js';
import { ListenPick } from './ListenPick.js';
import { MatchPairs } from './MatchPairs.js';
import { MultipleChoice, type ExerciseProps } from './MultipleChoice.js';
import { SentenceBuilder } from './SentenceBuilder.js';

export function ExerciseView({ exercise, answered, onAnswer }: ExerciseProps<Exercise>) {
  let body;
  switch (exercise.kind) {
    case 'multiple-choice':
      body = <MultipleChoice exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'listen-pick':
      body = <ListenPick exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'fill-blank':
      body = <FillBlank exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'sentence-builder':
      body = <SentenceBuilder exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'match-pairs':
      body = <MatchPairs exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
  }
  return (
    <div data-testid="exercise" data-kind={exercise.kind}>
      {body}
    </div>
  );
}
```

`apps/web/src/exercises/components/ExerciseBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  onError: () => void;
  children: ReactNode;
}

/** Spec §8: a broken exercise is skipped and logged; the session continues. */
export class ExerciseBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('exercise crashed, skipping it', error, info.componentStack);
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
```

`apps/web/src/practice/PracticeScreen.tsx`:

```tsx
import { uniqueHanChars, type UnitChunk } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useHasChineseVoice } from '../audio/speech.js';
import type { ContentIndex } from '../content/index.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { completeUnit } from '../db/progress.js';
import { ExerciseBoundary } from '../exercises/components/ExerciseBoundary.js';
import { ExerciseView } from '../exercises/components/ExerciseView.js';
import { generateSession } from '../exercises/generate.js';
import {
  accuracy,
  createSession,
  currentExercise,
  sessionProgress,
  sessionReducer,
  type SessionState,
} from '../exercises/session.js';
import { correctAnswerText, type Answer } from '../exercises/types.js';
import { requestSync } from '../sync/store.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function PracticeScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId/practice' });
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const audio = useHasChineseVoice();
  if (chunk.status === 'loading') return <Loading label="Preparing exercises…" />;
  if (chunk.status === 'error')
    return <InlineError message={`Could not load this unit: ${chunk.error.message}`} onRetry={chunk.retry} />;
  return <PracticeSession key={unitId} chunk={chunk.chunk} content={content} audio={audio} />;
}

function PracticeSession({ chunk, content, audio }: { chunk: UnitChunk; content: ContentIndex; audio: boolean }) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(
      generateSession(
        {
          chunk,
          words: content.words,
          levelWordIds: content.wordIdsByLevel.get(chunk.unit.level) ?? [],
          audio,
        },
        Date.now(),
      ),
    ),
  );
  const [answered, setAnswered] = useState<Answer | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (state.phase !== 'done' || recorded.current) return;
    recorded.current = true;
    const characters = uniqueHanChars(
      chunk.unit.wordIds.map((id) => content.words.get(id)?.simplified ?? '').join(''),
    );
    void completeUnit(db, {
      unitId: chunk.unit.id,
      wordIds: chunk.unit.wordIds,
      characters,
      now: Date.now(),
    }).then(() => requestSync({ db }));
  }, [state.phase, chunk, content]);

  if (state.phase === 'done') return <Results state={state} wordCount={chunk.unit.wordIds.length} />;

  const exercise = currentExercise(state);
  if (!exercise) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full bg-red-600 transition-all" style={{ width: `${Math.round(sessionProgress(state) * 100)}%` }} />
        </div>
        <span className="text-sm text-stone-600" aria-label="streak">
          {state.streak} in a row
        </span>
      </div>
      <ExerciseBoundary key={`${exercise.id}:${state.position}`} onError={() => dispatch({ type: 'skip' })}>
        <ExerciseView
          exercise={exercise}
          answered={answered}
          onAnswer={(a) => {
            setAnswered(a);
            dispatch({ type: 'answer', answer: a });
          }}
        />
      </ExerciseBoundary>
      {state.phase === 'feedback' && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg p-4 ${
            state.lastCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}
        >
          <div>
            <p className="font-semibold">{state.lastCorrect ? 'Correct!' : 'Not quite'}</p>
            {!state.lastCorrect && <p className="text-sm">Answer: {correctAnswerText(exercise)}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setAnswered(null);
              dispatch({ type: 'next' });
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function Results({ state, wordCount }: { state: SessionState; wordCount: number }) {
  return (
    <div data-testid="results" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Unit complete</h1>
      <p className="text-4xl font-semibold text-red-700">{Math.round(accuracy(state) * 100)}%</p>
      <p className="text-stone-600">accuracy</p>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-stone-700">
        <dt>Words learned</dt>
        <dd className="font-medium">{wordCount}</dd>
        <dt>Best streak</dt>
        <dd className="font-medium">{state.bestStreak}</dd>
        <dt>Answers</dt>
        <dd className="font-medium">{state.answered}</dd>
      </dl>
      <Link to="/" className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white">
        Back to path
      </Link>
    </div>
  );
}
```

In `apps/web/src/router.tsx`: import `PracticeScreen`, set `practiceRoute`'s `component: PracticeScreen`, and delete the `StepPending` function and its comment.

- [ ] **Step 4: Run tests, typecheck, build**

Run: `pnpm -F @hi-chinese/web test` — Expected: all passing (components: 7 new).
Run: `pnpm -F @hi-chinese/web typecheck && pnpm -F @hi-chinese/web build` — Expected: clean.
Manual smoke: `pnpm dev`, open Unit 1 → Practice, answer through to the results screen, return to the path and confirm Unit 1 shows Completed and Unit 2 is available; the header should read "Synced" (with `wrangler dev` running and migrated).

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "feat(web): exercise components and practice session with results"
```

---

### Task 11: Worker serves the built app; scripts and docs

**Files:**
- Modify: `apps/worker/wrangler.jsonc`, `apps/worker/package.json`, `apps/worker/test/health.test.ts` (comment only), `README.md`, `docs/superpowers/plans/README.md`, `packages/content/README.md` (one line, optional)

**Interfaces:**
- Produces: `pnpm build` then `pnpm worker:dev` serves the SPA at http://127.0.0.1:8787 with `/api/*` handled by the Worker and every other path served from `apps/web/dist` (SPA fallback to `index.html`).

- [ ] **Step 1: Wrangler assets**

In `apps/worker/wrangler.jsonc`, add after `"observability"`:

```jsonc
  // The built web app. `run_worker_first` keeps /api on the Worker; every other
  // request is answered by the assets layer, with SPA fallback for client routes.
  "assets": {
    "directory": "../web/dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"],
  },
```

In `apps/worker/package.json` add (Wrangler refuses to start when the assets directory is missing; tests do not need it):

```json
"predev": "node -e \"require('node:fs').mkdirSync('../web/dist', { recursive: true })\""
```

In `apps/worker/test/health.test.ts`, above the `answers unknown paths` test, add the comment:

```ts
  // In production non-API paths never reach the Worker (the assets layer serves
  // them); this pins the Worker's own behaviour, which the Vitest plugin exercises directly.
```

- [ ] **Step 2: Verify**

Run: `pnpm worker:test` — Expected: all 38 Worker tests still pass (the plugin ignores `assets`).
Run: `pnpm build` — Expected: content build + web build succeed.
Run: `pnpm worker:migrate:local && pnpm worker:dev` in one terminal (with `.dev.vars` present), then in another: `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:8787/` → `200 text/html...`; `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8787/unit/l1-u01` → `200`; `curl -s http://127.0.0.1:8787/api/health` → `{"ok":true}`; `curl -s http://127.0.0.1:8787/api/nope` → `{"error":"not found"}`. Stop the dev server.

- [ ] **Step 3: Docs**

`README.md`: replace the "Web app (Phase 3) is served by the same Worker…" sentence and add a section after "Content":

```markdown
## Web app (PWA)

    pnpm dev                     # Vite on :5173 (proxies /api to wrangler on :8787) + wrangler dev
    pnpm web:test                # Vitest (jsdom + fake-indexeddb)
    pnpm build                   # content build, then vite build into apps/web/dist
    pnpm e2e                     # Playwright: complete a unit end to end (see apps/web/e2e)

First run: `pnpm worker:migrate:local`, copy `apps/worker/.dev.vars.example` to `.dev.vars`, then
`pnpm dev` and open http://127.0.0.1:5173. Enter the passphrase from `.dev.vars` once; it is stored
in IndexedDB and sent as a bearer token. To try the production layout locally, `pnpm build` then
`pnpm worker:dev` and open http://127.0.0.1:8787 (the Worker serves `apps/web/dist` as static assets).

Offline: after the first load the service worker precaches the app and all content chunks (about
5 MB). A new deploy shows a "new version" toast instead of reloading mid-session.
```

Also update the first-deploy steps to run `pnpm build` (from the repo root) before `pnpm run deploy`, and change the Layout line for `apps/web` to "React PWA (Phase 3)".

`docs/superpowers/plans/README.md`: set the Phase 3 row to `2026-09-10-phase-3-web-core.md` with delivers text "`apps/web`: Vite + React PWA, Dexie progress with sync outbox, path/learn/practice, five exercise kinds, speech audio, Worker static assets, Playwright e2e"; append findings:

```markdown
- Phase 3 (2026-09-10): the Cloudflare Vitest plugin ignores the `assets` block, so asset serving is
  verified with `wrangler dev`, not in Vitest. Review-card rows are created on unit completion (empty
  FSRS state) so Phase 4 schedules existing rows. "Write it", strokes sheet, character page, review
  session and streak display moved to Phase 4. Listen-and-pick is not generated when no Chinese voice
  exists. Exercise markup carries `data-correct`/`data-answer-index`/`data-pair-*` attributes in DEV
  builds only, for the end-to-end test.
```

- [ ] **Step 4: Format and commit**

Run: `pnpm format:check` (fix with `pnpm format`), `pnpm typecheck`, `pnpm test`.

```bash
git add apps/worker README.md docs/superpowers/plans/README.md
git commit -m "feat(worker): serve the built web app as static assets; document web workflow"
```

---

### Task 12: End-to-end test: complete the first unit

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/complete-unit.spec.ts`

**Interfaces:**
- Consumes: the DEV-only markup contract from Task 10, the path markup from Task 6, `wrangler dev` with `--var SYNC_PASSPHRASE:test-passphrase`.

- [ ] **Step 1: Install the browser**

Run: `pnpm -F @hi-chinese/web exec playwright install chromium` (downloads Chromium into `~/.cache/ms-playwright`; no sudo). If the run later fails with missing shared libraries, report the exact library names instead of installing system packages.

- [ ] **Step 2: Playwright config**

`apps/web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

// Two servers: the Worker with a throw-away local D1 (fresh every run) and the
// Vite dev server, which proxies /api to it. DEV markup attributes are required.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command:
        'rm -rf .wrangler/e2e && mkdir -p ../web/dist && ' +
        'pnpm exec wrangler d1 migrations apply hi-chinese --local --persist-to .wrangler/e2e && ' +
        'pnpm exec wrangler dev --port 8787 --persist-to .wrangler/e2e --var SYNC_PASSPHRASE:test-passphrase',
      cwd: '../worker',
      url: 'http://127.0.0.1:8787/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec vite --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
```

- [ ] **Step 3: The test**

`apps/web/e2e/complete-unit.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function answerCurrent(page: Page): Promise<void> {
  const ex = page.getByTestId('exercise');
  const kind = await ex.getAttribute('data-kind');
  switch (kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      await ex.locator('[data-correct="true"]').click();
      return;
    case 'sentence-builder': {
      const n = await ex.locator('[data-answer-index]').count();
      for (let i = 0; i < n; i++) await ex.locator(`[data-answer-index="${i}"]`).click();
      await page.getByRole('button', { name: 'Check' }).click();
      return;
    }
    case 'match-pairs': {
      const n = await ex.locator('[data-pair-left]').count();
      for (let i = 0; i < n; i++) {
        await ex.locator(`[data-pair-left="${i}"]`).click();
        await ex.locator(`[data-pair-right="${i}"]`).click();
      }
      return;
    }
    default:
      throw new Error(`unknown exercise kind: ${kind}`);
  }
}

test('a fresh device sets up, learns and completes Unit 1, and syncs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'HSK 1' })).toBeVisible();
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');

  await page.getByRole('link', { name: /^Unit 1/ }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Learn' }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1: Learn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New words' })).toBeVisible();
  await page.getByRole('link', { name: 'Start practice' }).click();

  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('results').isVisible()) break;
    await expect(page.getByTestId('exercise')).toBeVisible();
    await answerCurrent(page);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('results')).toContainText('100%');

  await page.getByRole('link', { name: 'Back to path' }).click();
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');

  // The progress reached the Worker: a second browser context with the same passphrase pulls it.
  const other = await page.context().browser()!.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await page2.getByLabel('Passphrase').fill('test-passphrase');
  await page2.getByRole('button', { name: 'Continue' }).click();
  await expect(page2.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'completed');
  await other.close();
});
```

- [ ] **Step 4: Run it**

Prerequisite: `apps/web/public/content` exists (`pnpm content:build`).

Run: `pnpm e2e` — Expected: 1 passed. On failure, open the trace under `apps/web/test-results/`. If `wrangler dev` cannot be started by Playwright's `webServer` on this machine, report the exact error; the fallback ruling is to point `webServer` at `vite preview` of a `VITE_E2E=1` build and drop the second-context sync assertion, and to record that in the ledger.

Run: `pnpm -F @hi-chinese/web typecheck` — Expected: clean (the `e2e` folder and config are included).

- [ ] **Step 5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e
git commit -m "test(web): Playwright end-to-end test completing Unit 1 against wrangler dev"
```

---

## Self-review notes

- Spec coverage (§4): path states, Learn cards, five of six exercise kinds (Write it → Phase 4), session rules (re-queue, progress, streak, results), completion marks the unit and creates review cards, `generateSession`/reducer pure and unit-tested, `speak` helper with no-voice handling. (§7 client): Dexie tables incl. outbox and meta, sync after each session and on start/online, LWW by `updatedAt`, outbox retained on failure, header indicator, fresh-device pull before the path, 401 re-prompt via Settings. (§8): vite-plugin-pwa manifest and Workbox precache incl. content, update toast, `/api` never cached, chunk retry + inline error, route error boundary, broken exercise skipped. (§9): unit tests for generator, reducer, sync merge; e2e "complete a unit". Not in this phase: streak computation/display, FSRS grading, install-and-go-offline e2e (Phase 4 adds it with the review e2e).
- Type consistency checked across tasks: `Answer`, `ExerciseProps`, `SessionInput`, `HiChineseDb`, `OutboxRow`, `SyncResult`/`SyncStatus`, `UnitChunkState`, `ContentLoaders`.
