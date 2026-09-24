# Sentence expansion: two sentences per lesson, every word in a sentence

Date: 2026-09-24. Follows the curriculum audit (parts 1-5, all merged and deployed).

## Problem

Measured on the built content at `684b65a`:

| Level | Lessons | Lessons with <2 builder sentences | Sentences needed for 2 per lesson | Words in no sentence |
|---|---|---|---|---|
| L1 | 140 | 69 | 77 | 88 / 506 |
| L2 | 208 | 82 | 82 | 312 / 750 |
| L3 | 272 | 127 | 127 | 519 / 953 |

A "builder sentence" has at least 3 words. `generateSession` makes up to 2
sentence-builder exercises per session from the lesson's builder sentences, so a
lesson with one such sentence gets one builder. A word that appears in no
sentence is only ever drilled in isolation (multiple choice, listen-and-pick),
never seen in context. "Words in no sentence" counts words absent from every
sentence of every level.

## Goal

1. Every lesson of every unit has at least 2 builder sentences, counted with the
   real `computeLessons`.
2. Every course word appears in at least one sentence, except words in an
   allowlist with a written reason. The allowlist holds under 2% of course words
   (under 44 of 2209).

Both are data guards: the test suite fails when either breaks.

## Non-goals

- No new grammar examples; the grammar validator stays at ≥1 example (3-5 is a
  separate item).
- No unit or lesson order changes, no changes to `computeLessons` or exercise
  generation.
- Existing sentences are not rewritten, except to fix an error found while
  writing next to them (logged in the review list).

## Rules for a new sentence

- **Vocabulary.** A sentence for lesson k of unit u uses only words of earlier
  units (all levels, in course order) and lessons 0..k of u. It then lands in
  lesson k, because placement goes to the lesson of the latest word.
- **Coverage first.** Each new sentence contains at least one word of lesson k
  that has no sentence yet, while the lesson has such words. A lesson is done
  when it has ≥2 builder sentences and none of its words is uncovered.
- **Length.** 3 to 8 tokens.
- **Tokens and readings.** Tokens are course words (`words.json` simplified
  forms). For polyphones, check that the course reading is the one meant; if the
  sentence needs another reading that the word does not have, pick another
  sentence.
- **Pinyin.** Follows the conventions the sentence pinyin checker enforces. The
  existing data test `sentence-pinyin-data.test.ts` covers new sentences with no
  change.
- **Vietnamese.** A natural translation, not a gloss; keep register consistent
  with the Chinese.
- **Ids.** Continue the fill series: `s:l1:fill:045…`, `s:l2:fill:205…`,
  `s:l3:fill:280…`, in the level file of the sentence's latest word.
- **Naturalness.** A sentence a native speaker would say. A lesson full of
  "我有X。" / "这是X。" frames is a defect; vary the frames within a unit.

## Uncovered-word allowlist

New authored file `packages/content/src/authored/uncovered-words.json`:
`{ "<simplified>": "<reason>" }`. Valid reasons are that the word cannot
appear in a natural sentence with the vocabulary available at its lesson, or
that it duplicates a covered word (e.g. an 儿化 variant whose base form has
sentences). The guard fails on an allowlisted word that is actually covered, so
the list stays minimal.

## Tooling

Extend `pnpm -F @hi-chinese/content lesson-gaps`:

- `--min <n>` (default 1): report lessons with fewer than n builder sentences.
- For each reported lesson, print its builder-sentence count and mark words with
  no sentence (`[no sentence]`).
- The summary line reports lessons below `--min` and uncovered words in scope.

Counting lives in `pipeline/lesson-gaps.ts` with unit tests:
`lessonSentenceCounts` gains a builder-only mode (≥3 words), and a new
`uncoveredWords(wordIds, allSentences)` returns the ids absent from every
sentence.

## Guards

- `apps/web/test/content/lesson-coverage-data.test.ts`: the existing "at least
  one sentence" test stays; a new test requires ≥2 sentences of ≥3 words per
  lesson for every level listed in a `LEVELS_DONE` constant.
- New `apps/web/test/content/word-coverage-data.test.ts`: every word of every
  level in `LEVELS_DONE` is in some sentence or in the allowlist; no allowlisted
  word is covered; the allowlist stays under 2% of course words.
- `LEVELS_DONE` grows from `[]` to `[1, 2, 3]` as each level finishes, so the
  suite stays green between tasks; the final state lists all three levels.

## Work breakdown

Sequential by level (L1, then L2, then L3), since L2/L3 sentences may use
earlier words and must not collide on ids. Each level is split into tasks of
roughly 10-20 units. A task writes sentences for its unit range, rebuilds, runs
the suite, and appends its sentences to that level's review list. The task
that finishes a level adds the level to `LEVELS_DONE`.

Expected volume: about 110 sentences for L1, 200 for L2, 300 for L3 (a sentence
often covers 2 uncovered words).

## Review

- Each task's reviewer reads every new sentence for naturalness, translation
  and reading. The pinyin checker covers tones and word boundaries.
- Review lists: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md`,
  one section per level, one table row per sentence (id, zh, pinyin, vi, empty
  note column), plus the allowlist with reasons.
- The content is AI-written. It needs native-speaker review. The previous
  batches were deployed before review at the user's request; the same choice
  applies here.

## Success criteria

- Both guards pass with `LEVELS_DONE = [1, 2, 3]`.
- `pnpm content:build` reports no problems; full test suite green.
- Allowlist under 44 entries, each with a reason.
- Review list lists every new sentence.
