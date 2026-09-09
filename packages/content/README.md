# @hi-chinese/content

Turns open data plus authored grammar and sentences into static JSON chunks.

## Pipeline

1. `fetchRaw` downloads `complete.json`, `dictionary.txt`, `graphics.txt` into `raw/` (git-ignored, cached).
2. `parseHskWords` keeps HSK 3.0 levels 1-3, merges duplicate readings, picks the primary reading
   (heuristic + `src/authored/pinyin-overrides.json`).
3. `assignUnits` chunks each level's words by frequency into units of 12.
4. `placeSentences` / `placeGrammar` put authored content into the earliest unit where all its words are known.
5. `buildCharacters` extracts stroke and dictionary data for every character in the course.
6. `validateContent` fails the build on any inconsistency.
7. `writeContent` emits `manifest.json`, `words.json`, `units/<id>.json`, `characters/<hex>.json`.

## Authoring

- `src/authored/sentences/*.json`: arrays of `{ id, zh, pinyin, en, words }`. `words` are the simplified
  tokens of `zh` in order; every token must be a course word. Ids: `s:l<level>:<nnn>`.
- `src/authored/grammar/*.json`: arrays of `{ id, title, pattern, explanation, level, examples }` where
  `examples` are sentence ids. Ids: `g:<kebab-slug>`. A unit holds at most 2 grammar points.
- `src/authored/pinyin-overrides.json`: `{ "<simplified>": "<numeric pinyin>" }` for words where the
  automatic reading choice is wrong. Run `pnpm report:readings` to review all multi-reading words.

## Commands

    pnpm test
    pnpm build            # full pipeline, writes ../../apps/web/public/content
    CONTENT_OUT=/tmp/x/content pnpm build
    pnpm report:readings
