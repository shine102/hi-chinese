import type { Authored } from './authored.js';
import { buildCharacters } from './characters.js';
import { makeHanViet } from './hanviet.js';
import { parseHskWords, type RawHskEntry } from './hsk.js';
import { attachToUnits, placeAuthoredGrammar, placeGrammar, placeSentences } from './placement.js';
import { assignUnits } from './units.js';
import { validateContent } from './validate.js';
import type { ContentBundle } from '../types.js';

export interface RunInputs {
  hskJson: string;
  dictionaryText: string;
  graphicsText: string;
  authored: Authored;
}

export type RunResult = { ok: true; bundle: ContentBundle } | { ok: false; problems: string[] };

export function assembleContent(inputs: RunInputs): RunResult {
  const entries = JSON.parse(inputs.hskJson) as RawHskEntry[];
  const hanViet = makeHanViet(inputs.authored.hanViet);
  const parsed = parseHskWords(entries, inputs.authored.overrides, hanViet, inputs.authored.meanings);
  const { units: bareUnits, words } = assignUnits(parsed, inputs.authored.units);

  const { sentences, errors: sentenceErrors } = placeSentences(
    inputs.authored.sentences,
    words,
    bareUnits,
  );
  // Level 1 is the introduction level: its example sentences use only level-1 vocabulary, so
  // placing a grammar point at the EARLIEST unit among its examples is unambiguous and pedagogically
  // right (explain the pattern as soon as it's first demonstrable). Levels 2/3 don't get this
  // treatment even once they have authored (thematic) units: their example sentences deliberately
  // reuse simple, lower-level filler vocabulary so the sentence highlights the new pattern rather
  // than new words — which means the EARLIEST placement is fragile (any one "easy" example sentence
  // drags a whole grammar point's placement down to an earlier level, an authoring mismatch that
  // isn't really a mismatch). `placeGrammar`'s LATEST + cap/spill + graceful under-level fallback is
  // robust to that and is used for every level except 1, unconditionally.
  const { grammar: authoredGrammar, errors: authoredGrammarErrors } = placeAuthoredGrammar(
    inputs.authored.grammar.filter((g) => g.level === 1),
    sentences,
    bareUnits,
  );
  // maxPerUnit raised from the default 2 to 4: thematic (not frequency-chunked) L2/L3 units cluster
  // grammar points that share trigger vocabulary (e.g. time-expression or cognition-verb themes)
  // into the same few units far more than the near-uniform frequency chunking the default assumed.
  // Total grammar count is well within overall level capacity — this is a distribution problem, not
  // a capacity one — so a moderate cap increase (verified empirically to clear all placement
  // conflicts for the current L2/L3 grammar set, still forward-only/same-level, never displacing a
  // point before its own example vocabulary is taught) is the correct fix, not a bigger cap value.
  const { grammar: pipelineGrammar, errors: pipelineGrammarErrors } = placeGrammar(
    inputs.authored.grammar.filter((g) => g.level !== 1),
    sentences,
    bareUnits,
    4,
  );
  const grammar = [...authoredGrammar, ...pipelineGrammar];
  const grammarErrors = [...authoredGrammarErrors, ...pipelineGrammarErrors];
  const units = attachToUnits(bareUnits, sentences, grammar);

  const { characters, missing } = buildCharacters(
    inputs.dictionaryText,
    inputs.graphicsText,
    words,
    (ch) => hanViet.char(ch),
    inputs.authored.charDefinitions,
  );

  const bundle: ContentBundle = { words, characters, units, grammar, sentences };
  const problems = [
    ...sentenceErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
    ...grammarErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
    ...missing.map((ch) => `[characters] no stroke data for ${ch}`),
    ...validateContent(bundle).map((e) => `[${e.rule}] ${e.message}`),
  ];
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, bundle };
}
