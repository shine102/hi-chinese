import type { ContentBundle } from '../types.js';

export interface VietnameseCoverageReport {
  wordsOnEnglishFallback: string[];
  charactersOnEnglishFallback: string[];
}

export function findEnglishFallbacks(
  bundle: ContentBundle,
  viMeanings: Record<string, string[]>,
  viCharDefinitions: Record<string, string>,
): VietnameseCoverageReport {
  return {
    wordsOnEnglishFallback: bundle.words.filter((w) => !viMeanings[w.simplified]).map((w) => w.simplified),
    charactersOnEnglishFallback: bundle.characters
      .filter((c) => !viCharDefinitions[c.character])
      .map((c) => c.character),
  };
}
