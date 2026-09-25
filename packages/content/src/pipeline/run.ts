import type { Authored } from './authored.js';
import { attachAssociations, indexCedict, resolveAssociations, type ResolvedAssociations } from './associations.js';
import { buildCharacters } from './characters.js';
import { parseCedict } from './cedict.js';
import { makeHanViet } from './hanviet.js';
import { applyReadingFixes, parseHskWords, type RawHskEntry } from './hsk.js';
import { attachToUnits, placeAnchoredGrammar, placeAuthoredGrammar, placeGrammarByDensity, placeSentences } from './placement.js';
import { assignUnits } from './units.js';
import { validateContent } from './validate.js';
import type { ContentBundle } from '../types.js';

export interface RunInputs {
  hskJson: string;
  dictionaryText: string;
  graphicsText: string;
  authored: Authored;
  /** CVDICT.u8 text; association words outside the course are checked against it. */
  cvdictText?: string;
}

export type RunResult =
  | { ok: true; bundle: ContentBundle; associations: ResolvedAssociations }
  | { ok: false; problems: string[] };

export function assembleContent(inputs: RunInputs): RunResult {
  const entries = JSON.parse(inputs.hskJson) as RawHskEntry[];
  const hanViet = makeHanViet(inputs.authored.hanViet);
  const parsed = applyReadingFixes(
    parseHskWords(entries, inputs.authored.overrides, hanViet, inputs.authored.meanings),
    inputs.authored.readingFixes,
  );
  const { units: bareUnits, words } = assignUnits(parsed, inputs.authored.units);

  const { sentences, errors: sentenceErrors } = placeSentences(
    inputs.authored.sentences,
    words,
    bareUnits,
  );
  const anchored = inputs.authored.grammar.filter((g) => g.anchor !== undefined);
  const unanchored = inputs.authored.grammar.filter((g) => g.anchor === undefined);
  // Anchored points (any level) are pinned to their anchor word's unit and must have >= 2
  // examples placed there, so the unit's grammar slide always has examples to show. They
  // are placed independently of the density placer.
  const { grammar: anchoredGrammar, errors: anchoredErrors } = placeAnchoredGrammar(
    anchored,
    sentences,
    bareUnits,
    words,
  );
  // Level 1 is the introduction level: its example sentences use only level-1 vocabulary, so
  // placing a grammar point at the EARLIEST unit among its examples is unambiguous and pedagogically
  // right (explain the pattern as soon as it's first demonstrable). Levels 2/3 don't get this
  // treatment even once they have authored (thematic) units: their example sentences deliberately
  // reuse simple, lower-level filler vocabulary so the sentence highlights the new pattern rather
  // than new words — which means the EARLIEST placement is fragile (any one "easy" example sentence
  // drags a whole grammar point's placement down to an earlier level, an authoring mismatch that
  // isn't really a mismatch). Density placement is robust to that and is used for every level
  // except 1, unconditionally.
  const { grammar: authoredGrammar, errors: authoredGrammarErrors } = placeAuthoredGrammar(
    unanchored.filter((g) => g.level === 1),
    sentences,
    bareUnits,
  );
  // Levels 2/3: each unanchored point goes to the same-level unit holding the most of its
  // examples (ties -> earlier unit), and must have >= 2 there. The app only loads a unit's own
  // sentences, so this is what guarantees every grammar slide has examples and a fill-blank.
  // No per-unit cap: crowding is reported as a build warning (grammar-crowding.ts) instead.
  const { grammar: pipelineGrammar, errors: pipelineGrammarErrors } = placeGrammarByDensity(
    unanchored.filter((g) => g.level !== 1),
    sentences,
    bareUnits,
  );
  const grammar = [...anchoredGrammar, ...authoredGrammar, ...pipelineGrammar];
  const grammarErrors = [...anchoredErrors, ...authoredGrammarErrors, ...pipelineGrammarErrors];
  const units = attachToUnits(bareUnits, sentences, grammar);

  const cvdict = indexCedict(inputs.cvdictText ? parseCedict(inputs.cvdictText) : []);
  const { byChar, errors: associationErrors } = resolveAssociations(
    inputs.authored.associations,
    words,
    cvdict,
    hanViet,
  );
  const linkedWords = attachAssociations(words, byChar);

  const { characters, missing } = buildCharacters(
    inputs.dictionaryText,
    inputs.graphicsText,
    linkedWords,
    (ch) => hanViet.char(ch),
    inputs.authored.charDefinitions,
  );

  const bundle: ContentBundle = { words: linkedWords, characters, units, grammar, sentences };
  const problems = [
    ...sentenceErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
    ...grammarErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
    ...missing.map((ch) => `[characters] no stroke data for ${ch}`),
    ...associationErrors.map((e) => `[${e.rule}] ${e.message}`),
    ...validateContent(bundle).map((e) => `[${e.rule}] ${e.message}`),
  ];
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, bundle, associations: byChar };
}
