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

## Checks

    pnpm test
    pnpm typecheck
    pnpm format:check

## Layout

- `packages/content` – content pipeline and shared types
- `apps/web` – React PWA (Phase 3)
- `apps/worker` – Cloudflare Worker API (Phase 2)

## Data sources and licenses

- HSK 3.0 word list: complete-hsk-vocabulary (MIT)
- Character strokes and dictionary: Make Me a Hanzi (LGPL / Arphic Public License, see its COPYING)
