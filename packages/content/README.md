# @hi-chinese/content

Turns open data plus authored grammar and sentences into static JSON chunks.

## Pipeline

1. `fetchRaw` downloads `complete.json`, `dictionary.txt`, `graphics.txt` into `raw/` (git-ignored, cached).
2. `parseHskWords` keeps HSK 3.0 levels 1-3, merges duplicate readings, picks the primary reading
   (heuristic + `src/authored/pinyin-overrides.json`).
3. `assignUnits` chunks each level's words by frequency into units of 12.
4. `placeSentences` puts each sentence into the latest unit among its words (the earliest unit where all
   its words are known). Grammar is placed by three placers:
   - `placeAnchoredGrammar`: points with an `anchor` word (any level) go to that word's unit.
   - `placeAuthoredGrammar`: unanchored level-1 points go to the earliest unit among their examples.
   - `placeGrammarByDensity`: unanchored level-2/3 points go to the same-level unit holding the most of
     their examples (ties -> earlier unit).
   Anchored and density-placed points must have >= 2 examples in their unit.
5. `buildCharacters` extracts stroke and dictionary data for every character in the course.
6. `validateContent` fails the build on any inconsistency.
7. `writeContent` emits `manifest.json`, `words.json`, `units/<id>.json`, `characters/<hex>.json`.

## Authoring

- `src/authored/sentences/*.json`: arrays of `{ id, zh, pinyin, en, words }`. `words` are the simplified
  tokens of `zh` in order; every token must be a course word. Ids: `s:l<level>:<nnn>`.
- `src/authored/grammar/*.json`: arrays of `{ id, title, pattern, explanation, level, examples }` where
  `examples` are sentence ids. Ids: `g:<kebab-slug>`. Units with more than 5 grammar points
  get a build warning.
- `src/authored/pinyin-overrides.json`: `{ "<simplified>": "<numeric pinyin>" }` for words where the
  automatic reading choice is wrong. Run `pnpm report:readings` to review all multi-reading words.
- `src/authored/themes/level{2,3}.json`: L2/L3 content words → named subthemes (source for unit layout).
- `pnpm -F @hi-chinese/content retheme-units`: one-off rebuild of `authored/units/level{2,3}.json` from
  the themes (pins inside the script).

## Commands

    pnpm test
    pnpm build            # full pipeline, writes ../../apps/web/public/content
    CONTENT_OUT=/tmp/x/content pnpm build
    pnpm report:readings
