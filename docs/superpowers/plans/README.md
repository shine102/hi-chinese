# Hi Chinese implementation roadmap

Spec: `docs/superpowers/specs/2026-09-09-hi-chinese-design.md`

The spec is implemented in phases. Each phase has its own plan and ends with
working, testable software. Later plans are written when the previous phase
lands, so they reference real code rather than guesses.

| Phase | Plan | Delivers |
|-------|------|----------|
| 1 | `2026-09-09-phase-1-content-pipeline.md` | pnpm workspace, shared content types, fetch/normalize/assign/validate/build pipeline emitting JSON chunks, seed authored content |
| 2 | `2026-09-10-phase-2-worker-sync.md` | `apps/worker`: Hono on Cloudflare Workers, D1 schema + migrations, passphrase auth, `POST /api/sync` with last-write-wins and a server sequence cursor, Vitest in workerd against local D1 |
| 3 | `2026-09-10-phase-3-web-core.md` | `apps/web`: Vite + React PWA, Dexie progress with sync outbox, path/learn/practice, five exercise kinds, speech audio, Worker static assets, Playwright e2e |
| 4 | `2026-09-11-phase-4-review-writing.md` | FSRS review deck and session, Hanzi Writer integration (learn sheet, write-it exercise, write-from-memory review), character page, streak |
| 5 | `2026-09-11-phase-5-content-authoring.md` | Grammar points and example sentences for every unit, vocab-context script, readings review for multi-pronunciation words |

Findings from source verification (2026-09-09) that adjust the spec:

- The HSK 3.0 source list (`complete-hsk-vocabulary`, MIT) tags levels as
  `new-1`..`new-3`. Levels 1 to 3 contain **2209 unique words** and
  **899 unique characters**, more than the 1484 target in the spec. Counts
  follow the source, as the spec allows.
- Every word in that list already carries pinyin, traditional form and
  English meanings, so **CC-CEDICT is not needed** and is dropped from the
  pipeline.
- 317 words have several readings and the source does not order them by
  commonness (for example 说 lists shuì first). The pipeline picks a reading
  by heuristic and supports a hand-maintained override file.
- Make Me a Hanzi `graphics.txt` entries (`strokes`, `medians`) match
  Hanzi Writer's `CharacterJson` shape directly; no conversion needed.
- Cloudflare's Vitest integration (`@cloudflare/vitest-plugin`) requires
  Vitest 4.1.x, so the whole workspace pins Vitest 4.1.
- Spec §3 lists `related word ids` on GrammarPoint; Phase 1 omits the
  field (no consumer yet). The validator therefore checks grammar →
  sentence references only; grammar → word references are covered
  indirectly because every example sentence's words are validated.
  Revisit if Phase 3 needs it.
- Phase 2 defers static-asset serving to Phase 3: Wrangler requires the assets directory to exist and
  `apps/web/dist` does not yet. Sync cursors are server sequence numbers (one per sync batch), not
  timestamps, so device clock skew cannot lose rows.
- Phase 3 client merge rule: a pushed row absent from the sync response lost LWW; apply the same
  `updatedAt` rule locally and treat echoed rows as no-ops. Activity counters (lessons/reviews per
  day) are overwritten under LWW, not summed; the streak only needs the day to exist.
- Phase 3 dev server: Vite (:5173) must proxy `/api` to `wrangler dev` (:8787) via `server.proxy`;
  the Worker has no CORS handling by design.
- Phase 3 (2026-09-10): the Cloudflare Vitest plugin ignores the `assets` block, so asset serving is
  verified with `wrangler dev`, not in Vitest. Review-card rows are created on unit completion (empty
  FSRS state) so Phase 4 schedules existing rows. "Write it", strokes sheet, character page, review
  session and streak display moved to Phase 4. Listen-and-pick is not generated when no Chinese voice
  exists. Exercise markup carries `data-correct`/`data-answer-index`/`data-pair-*` attributes in DEV
  builds only, for the end-to-end test.
- Phase 4 (2026-09-11): `hanzi-writer` 3.7.3 renders SVG in a div; `charDataLoader` fetches from
  bundled `/content/characters/<hex>.json` — same data Make Me a Hanzi produces, no CDN needed.
  `ts-fsrs` 5.4.2 `fsrs().repeat()` returns `Record<Grade, { card, log }>` (Grade, not Rating, under
  strict TS — cast required). Review session uses its own reducer (not the practice sessionReducer):
  no re-queue, FSRS grade per card, self-grade UI for write cards. Cards are resolved by
  `exercise.id === card.cardId` after shuffle, not by array index. `playwright.config.ts` uses
  `CHROME_PATH` env var (set `CHROME_PATH=/var/lib/flatpak/exports/bin/com.google.Chrome` on this
  machine); workers serialized to 1 for single-D1-backend stability. `useLiveQuery` silent-failure
  gap (deferred from Phase 3) still applies to new PathScreen queries (dueCount, activities).
