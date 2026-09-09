import type { Authored } from './authored.js';
import { buildCharacters } from './characters.js';
import { parseHskWords, type RawHskEntry } from './hsk.js';
import { attachToUnits, placeGrammar, placeSentences } from './placement.js';
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
  const parsed = parseHskWords(entries, inputs.authored.overrides);
  const { units: bareUnits, words } = assignUnits(parsed);

  const { sentences, errors: sentenceErrors } = placeSentences(
    inputs.authored.sentences,
    words,
    bareUnits,
  );
  const { grammar, errors: grammarErrors } = placeGrammar(
    inputs.authored.grammar,
    sentences,
    bareUnits,
  );
  const units = attachToUnits(bareUnits, sentences, grammar);

  const { characters, missing } = buildCharacters(
    inputs.dictionaryText,
    inputs.graphicsText,
    words,
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
