# Hi Chinese implementation roadmap

Spec: `docs/superpowers/specs/2026-09-09-hi-chinese-design.md`

The spec is implemented in phases. Each phase has its own plan and ends with
working, testable software. Later plans are written when the previous phase
lands, so they reference real code rather than guesses.

| Phase | Plan | Delivers |
|-------|------|----------|
| 1 | `2026-09-09-phase-1-content-pipeline.md` | pnpm workspace, shared content types, fetch/normalize/assign/validate/build pipeline emitting JSON chunks, seed authored content |
| 2 | phase-2-worker-sync (to write) | Cloudflare Worker (Hono), D1 schema + migrations, passphrase auth, `POST /api/sync`, Vitest + Miniflare tests |
| 3 | phase-3-web-core (to write) | React PWA shell, routing, content loading, Dexie tables + outbox, path screen, learn step, exercise engine + practice session, audio, sync client, install/offline |
| 4 | phase-4-review-writing (to write) | FSRS review deck and session, Hanzi Writer integration (learn sheet, write-it exercise, write-from-memory review), character page, streak |
| 5 | phase-5-content-authoring (to write) | Grammar points and example sentences for every unit, produced in reviewed batches, readings review for multi-pronunciation words |

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
