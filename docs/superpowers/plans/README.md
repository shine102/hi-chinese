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
| 6 | `2026-09-11-phase-6-sub-lessons.md` | Sub-lesson system: each unit's words split into 3-4 lessons of 3-4 words, with review of earlier sub-lessons, per-lesson progress tracking |

After phase 6, work continued as focused plans:

| Plan | Spec | Delivers | Status |
|------|------|----------|--------|
| `2026-09-12-p0-authored-units-safety-net.md` | `2026-09-12-vietnamese-hanviet-localization-design.md` (P0) | Unit composition becomes an authored input, so the pipeline regenerates the hand-edited L1 units | merged |
| `2026-09-12-p1-han-viet-readings.md` | same (P1) | Âm Hán Việt for every character and word, shown next to pinyin | merged |
| `2026-09-12-p2-vietnamese-meanings.md` | same (P2) | Vietnamese replaces English for meanings, definitions, sentences and grammar explanations | merged |
| `2026-09-13-p4-p5-l2-l3-themes.md` | same (P4-P5) | Themed L2/L3 units replace frequency-chunked "Unit N" placeholders | merged |
| `2026-09-14-multi-user-sync.md` | `2026-09-14-multi-user-sync-design.md` | Per-user passphrases; D1 progress partitioned by user | merged |

Curriculum audit (2026-09-24):

| Plan | Spec | Delivers | Status |
|------|------|----------|--------|
| `2026-09-24-core-grammar.md` | `2026-09-24-core-grammar-design.md` | 19 missing core grammar points, pinned to units by `anchor` | merged |
| `2026-09-24-l2-l3-grammar-placement.md` | `2026-09-24-l2-l3-grammar-placement-design.md` | Every L2/L3 grammar point sits in a unit with ≥2 of its examples | merged |
| `2026-09-24-lesson-sentence-coverage.md` | `2026-09-24-lesson-sentence-coverage-design.md` | Every lesson has ≥1 sentence | merged |
| `2026-09-24-l2-l3-retheme.md` | `2026-09-24-l2-l3-retheme-design.md` | L2/L3 units rebuilt from named subthemes; function words spread; ≤5 grammar points per unit | merged |
| `2026-09-24-unit-order-tech-debt.md` | `2026-09-24-unit-order-tech-debt-design.md` | Concrete-first (tier) unit order; sentence pinyin data guard and reading fixes; no crowded unit on any level; `useLiveQuery` errors shown with retry; built content tracked in git | merged |
| `2026-09-24-sentence-expansion.md` | `2026-09-24-sentence-expansion-design.md` | Every lesson has ≥2 sentences of ≥3 words; every word is in a sentence or the reasoned allowlist | merged |

Still open:

- Native-speaker review of AI-written content before any external deploy (lists in
  `docs/superpowers/specs/*-native-review.md`).
- `g:yi-jiu` (一…就) sits in l2-u32; pin 哭 earlier if it should be taught sooner.
- Grammar validator requires ≥1 example per point, not the spec's 3-5.
- Saved L2/L3 lesson progress from before the 2026-09-24 reorder points at the old units.

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
  gap (deferred from Phase 3) still applies to new PathScreen queries (dueCount, activities)
  — fixed 2026-09-24 (`2026-09-24-unit-order-tech-debt.md`).
- Phase 5 (2026-09-11): authored 261 grammar points and 939 sentences across all 184 units (61 L1,
  95 L2, 105 L3). Extended pinyin overrides from 9 to 23 entries. Content authored by AI agent,
  validated by the existing pipeline. 12 of 79 L3 units (plus 6 of 42 L1 units) have no grammar
  (concrete-noun units without grammar-worthy patterns); every L2 unit has at least one. Grammar
  validator checks sentenceIds.length > 0 (not the spec's 3-5 minimum); tighten in a future
  hardening pass. Exercise generation (fill-blank, sentence-builder) now has real sentence data for
  all units with grammar.
