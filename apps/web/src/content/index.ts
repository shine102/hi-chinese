import type { ContentManifest, HskLevel, ManifestUnit, Word } from '@hi-chinese/content';

export interface ContentIndex {
  manifest: ContentManifest;
  words: ReadonlyMap<string, Word>;
  /** Every unit id in path order: all of level 1, then level 2, then level 3. */
  unitOrder: readonly string[];
  unitById: ReadonlyMap<string, ManifestUnit>;
  wordIdsByLevel: ReadonlyMap<HskLevel, readonly string[]>;
}

export function buildContentIndex(manifest: ContentManifest, words: readonly Word[]): ContentIndex {
  const wordMap = new Map<string, Word>();
  const byLevel = new Map<HskLevel, string[]>([
    [1, []],
    [2, []],
    [3, []],
  ]);
  for (const w of words) {
    wordMap.set(w.id, w);
    byLevel.get(w.level)?.push(w.id);
  }
  return {
    manifest,
    words: wordMap,
    unitOrder: manifest.levels.flatMap((l) => l.unitIds),
    unitById: new Map(manifest.units.map((u) => [u.id, u])),
    wordIdsByLevel: byLevel,
  };
}
