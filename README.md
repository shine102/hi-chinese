# Hi Chinese

A single-user, installable web app (PWA) for learning Mandarin, modeled on
HelloChinese. Covers HSK 3.0 levels 1 to 3. Runs on Cloudflare Workers with
progress stored in D1.

Design: `docs/superpowers/specs/2026-09-09-hi-chinese-design.md`.
Roadmap: `docs/superpowers/plans/README.md`.

## Setup

    corepack enable && corepack prepare pnpm@10.34.5 --activate
    pnpm install

## Content

    pnpm content:fetch   # download open data into packages/content/raw (cached)
    pnpm content:build   # emit apps/web/public/content/*

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

## Checks

    pnpm test
    pnpm typecheck
    pnpm format:check

## Worker (API + D1)

    pnpm worker:test             # Vitest inside workerd against a migrated local D1
    pnpm worker:migrate:local    # apply migrations to the local dev database
    cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # set SYNC_PASSPHRASE
    pnpm worker:dev              # http://127.0.0.1:8787

Endpoints: `GET /api/health`, `POST /api/sync` (header `Authorization: Bearer <SYNC_PASSPHRASE>`,
body `{ cursor, changes: { unitProgress, cards, activity } }`, response same shape). Rows merge by
last write wins on `updatedAt`; `cursor` is the server sequence number to send next time.
A pushed row that is missing from the response lost last-write-wins (the server already had a
newer `updatedAt`); the client should adopt the server value by re-pulling with `cursor: 0` for
that table or on next sync. Pushed rows that win are echoed back with the new sequence number.

### First deploy (run by hand, once)

    pnpm build                                   # from the repo root: content + web
    cd apps/worker
    pnpm exec wrangler login
    pnpm exec wrangler d1 create hi-chinese      # paste the printed database_id into wrangler.jsonc
    pnpm db:migrate:remote
    pnpm exec wrangler secret put SYNC_PASSPHRASE
    pnpm run deploy

## Layout

- `packages/content` – content pipeline and shared types
- `apps/web` – React PWA (Phase 3)
- `apps/worker` – Cloudflare Worker API (Phase 2)

## Data sources and licenses

- HSK 3.0 word list: complete-hsk-vocabulary (MIT)
- Character strokes and dictionary: Make Me a Hanzi (LGPL / Arphic Public License, see its COPYING)
