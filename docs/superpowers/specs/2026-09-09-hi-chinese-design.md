# Hi Chinese: HelloChinese-style PWA — Design

Date: 2026-09-09
Status: approved for planning

## 1. Goal and scope

A single-user, installable web app (PWA) for learning Mandarin, modeled on
HelloChinese. Deployed as a Cloudflare Worker with progress stored in D1.
Teaching language is English.

### In scope (version one)

- Lesson path with quiz exercises, covering HSK 3.0 levels 1 to 3
  (target: about 1484 words and 277 grammar points, driven by open data).
- Spaced-repetition review of learned words and characters (FSRS).
- Character writing with stroke-order animation and stroke-by-stroke tracing.
- Offline use after install; progress synced to D1 when online.
- Single passphrase auth.

### Out of scope (later sub-projects)

- Speaking practice / pronunciation scoring.
- Games, immersion stories, podcasts.
- Multi-user accounts, content editor, analytics.
- Vietnamese or bilingual UI.

## 2. Stack and repository layout

pnpm workspace with three packages.

```
apps/web            React 19 + TypeScript + Vite, Tailwind, TanStack Router,
                    Dexie (IndexedDB), vite-plugin-pwa (Workbox)
apps/worker         Cloudflare Worker (Hono). Serves static assets from
                    apps/web/dist and the /api routes. D1 binding. Wrangler
                    for dev/deploy. Migrations in apps/worker/migrations.
packages/content    Content pipeline: fetch scripts, authored data (src/),
                    build step emitting JSON chunks into
                    apps/web/public/content/. Exports shared TypeScript
                    types for content and progress.
```

Tooling: pnpm, Vitest, Playwright, ESLint, Prettier. `pnpm dev` runs Vite
and Wrangler together so the app talks to a local D1.

## 3. Content model and pipeline

### Hierarchy

Level (HSK 1, 2, 3) → Unit (about 10 new words + 1 or 2 grammar points) →
exercises generated from the unit's words, sentences and grammar. About
150 units total.

### Types (stable string ids)

- **Word**: id, simplified, traditional, pinyin (tone marks + numeric),
  English definitions, part of speech, HSK level, character ids.
- **Character**: id (the character), pinyin readings, meaning, stroke data
  (Make Me a Hanzi format, consumable by Hanzi Writer), radical,
  decomposition.
- **GrammarPoint**: id, title, pattern, English explanation (Markdown),
  3 to 5 example sentence ids, HSK level, related word ids.
- **Sentence**: id, Chinese, pinyin, English, word ids used. Every sentence
  uses only words from its unit or earlier units.
- **Unit**: id, level, order, title, word ids, grammar ids, sentence ids.

### Pipeline (`packages/content`)

1. **Fetch**: download HSK 3.0 word list (candidate: complete-hsk-vocabulary
   GitHub repo, verified during implementation), CC-CEDICT, Make Me a Hanzi
   dictionary and graphics. Cached in `raw/`, git-ignored.
2. **Normalize**: dedupe words, attach CC-CEDICT definitions, compute the
   character set, extract stroke data only for characters in the course.
3. **Author**: grammar points in `src/grammar/*.json`, sentences in
   `src/sentences/*.json`, committed. Drafts are generated in batches by a
   script for human review and editing.
4. **Build**: assign words to units by level and frequency order; emit
   `content/manifest.json` (content version + chunk list), one JSON chunk
   per unit, and one chunk per character under `content/characters/`.

### Validation (build fails on)

- A sentence uses a word not yet introduced by its unit.
- A word has no definition.
- A character in the course has no stroke data.
- A grammar point references a missing sentence or word.

Word and grammar counts come from the source lists; they land near but are
not forced to 1484 / 277.

## 4. Lesson path and exercise engine

### Path screen

Vertical path of units grouped by level. Unit states: locked, available,
in progress, completed. The unit after the last completed one is unlocked;
everything before it stays available. Each unit has a Learn step and a
Practice step.

### Learn step

Cards for each new word (character, pinyin, meaning, tap to hear, tap for
strokes) and each grammar point (explanation + examples with audio).

### Practice step

A session of about 15 exercises generated from the unit's content.

Exercise types:

- **Multiple choice**: Chinese→English, English→Chinese, pinyin→Chinese.
  4 options; distractors from the same unit or level.
- **Listen and pick**: hear a word or sentence, choose the Chinese from 4.
- **Match pairs**: 5 Chinese words ↔ 5 English meanings.
- **Sentence builder**: arrange shuffled word tiles into the sentence,
  with 2 distractor tiles.
- **Fill the blank**: sentence with one word removed, pick from 4. Used
  mainly for grammar points.
- **Write it**: 1 or 2 per unit, Hanzi Writer quiz mode with outline
  (see section 6).

Session rules: wrong answers are re-queued at the end. Progress bar,
correct-answer streak, results screen (words learned, accuracy).
Completing Practice marks the unit completed and adds its words and
characters to the review deck.

### Engine

- `generateSession(unit, contentIndex, seed)` is a pure function returning
  exercise objects.
- A pure reducer handles `answer`, `next`, and re-queue.
- Both unit tested without React. Components render by exercise type.
- Audio: one `speak(text)` helper wrapping `speechSynthesis`, selecting a
  `zh-CN` voice. If none exists, audio buttons are disabled and a hint
  explains how to install a voice.

## 5. Spaced-repetition review

### Cards

Every word and character from a completed unit becomes review cards:

- Word recognition: see Chinese → recall meaning and reading (multiple
  choice).
- Word recall: see English → pick the Chinese (multiple choice).
- Character write: given pinyin and meaning, write from memory (no
  outline).

### Scheduling

FSRS via `ts-fsrs`, default parameters, retention target 0.9. Card state
stores stability, difficulty, due, reps, lapses, state. Grades: Again,
Hard, Good, Easy. For pick-from-options cards: wrong → Again, correct →
Good. Hard/Easy exposed only on self-graded (writing) cards.

### Session

Home shows due count and streak. A review session takes all due cards,
capped at 50, random order. Reuses exercise components. New cards enter
only via lessons; review is old material only.

### Streak

A day counts if at least one lesson or one review session was completed.
Stored as a daily activity log; streak is computed from it, never stored
as a counter.

## 6. Character writing

- **Library**: Hanzi Writer, configured with a custom `charDataLoader`
  pointing at bundled `content/characters/<char>.json` (from Make Me a
  Hanzi). No CDN dependency; works offline.
- **Learn step**: "strokes" button on each word card opens a sheet with
  stroke-order animation per character, radical and meaning.
- **Practice step**: "Write it" exercise, quiz mode with outline; the
  library scores each stroke and shows a hint after 3 failed attempts on
  the same stroke.
- **Review**: write from memory, no outline. Suggested grade from total
  stroke mistakes: 0 → Easy, 1–2 → Good, 3+ → Hard, "show me" → Again.
  User may override before confirming.
- **Character page**: strokes, radical, decomposition, course words
  using the character. Reachable from any word.

## 7. Progress storage, sync, and auth

### Local first (Dexie / IndexedDB)

Tables:

- `unitProgress`: unitId, status, completedAt, updatedAt
- `cards`: cardId, type, FSRS state, updatedAt
- `activity`: date (YYYY-MM-DD), lessons, reviews, updatedAt
- `outbox`: pending row changes to push
- `meta`: sync cursor, passphrase, content version

### Sync

- Runs after each session and on app start when online.
- `POST /api/sync` pushes outbox rows and pulls rows changed since the
  client's cursor. Conflicts resolve last-write-wins per row by
  `updatedAt`.
- On failure the outbox is retained and retried on the next trigger.
- Header indicator: synced / pending / offline.
- Fresh device: after passphrase entry, pull full progress set before
  showing the path.

### D1 schema

Mirrors `unit_progress`, `cards`, `activity` with `updated_at`, plus
`sync_log` for cursors. Migrations in `apps/worker/migrations`, applied
with Wrangler.

### Auth

Single passphrase stored as a Wrangler secret. App asks once, stores it in
IndexedDB, sends it as a bearer token. Worker compares with a constant-time
check; 401 otherwise. The passphrase is never in the repo or logs.
Cloudflare Access can be added in front later without app changes.

### API surface

- `POST /api/sync`
- `GET /api/health`

## 8. PWA, offline, and error handling

### PWA

vite-plugin-pwa generates the manifest (standalone, portrait, icons, theme
color) and a Workbox service worker. Installable on Android, iOS (Add to
Home Screen), desktop Chrome.

### Caching

- App shell: precached; update shown as a "new version, reload" toast,
  never auto-reload mid session.
- Content chunks and character data: precached at install; content
  manifest version invalidates old chunks.
- API: never cached; handled by the sync outbox.

### Error handling

- No Chinese voice: banner with install instructions; audio disabled.
- Content chunk load failure: retry once, then inline error with retry.
- Sync 401: re-prompt passphrase, keep outbox.
- Sync 5xx / network: silent, indicator shows pending, retry later.
- Route-level React error boundary; a broken exercise is skipped and
  logged, the session continues.

## 9. Testing

- **Unit (Vitest)**: session generator, exercise reducer, FSRS grade
  mapping, streak computation, sync merge, content validator.
- **Worker (Vitest + Miniflare)**: sync endpoint against local D1,
  including auth rejection and conflict resolution.
- **Content build**: validation rules in section 3 fail the build.
- **E2E (Playwright)**: complete a unit; run a review session; install,
  go offline, complete a lesson.

## 10. Decisions log

- Approach: static content + thin Worker (chosen over content-in-D1 and
  snapshot-backup sync).
- FSRS over SM-2.
- Browser speech synthesis over pre-generated audio.
- Passphrase auth over Cloudflare Access for version one.
- English-only teaching language.
