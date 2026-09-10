import type { ContentManifest, Word } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../src/content/index.js';

function word(simplified: string, level: 1 | 2 | 3, unitId: string): Word {
  return {
    id: `w:${simplified}`,
    simplified,
    traditional: simplified,
    pinyin: 'x',
    pinyinNumeric: 'x1',
    meanings: ['meaning'],
    alternates: [],
    pos: [],
    classifiers: [],
    level,
    frequency: 1,
    characters: [...simplified],
    unitId,
  };
}

const manifest: ContentManifest = {
  version: 'v1',
  generatedAt: '2026-09-10T00:00:00.000Z',
  levels: [
    { level: 1, title: 'HSK 1', unitIds: ['l1-u01', 'l1-u02'] },
    { level: 2, title: 'HSK 2', unitIds: ['l2-u01'] },
  ],
  units: [
    { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 1, grammarCount: 0 },
    { id: 'l1-u02', level: 1, order: 2, title: 'Unit 2', wordCount: 1, grammarCount: 0 },
    { id: 'l2-u01', level: 2, order: 3, title: 'Unit 3', wordCount: 1, grammarCount: 0 },
  ],
  characters: [],
  counts: { words: 3, characters: 0, grammar: 0, sentences: 0, units: 3 },
};

describe('buildContentIndex', () => {
  const index = buildContentIndex(manifest, [
    word('我', 1, 'l1-u01'),
    word('你', 1, 'l1-u02'),
    word('朋友', 2, 'l2-u01'),
  ]);

  it('orders units level by level in path order', () => {
    expect(index.unitOrder).toEqual(['l1-u01', 'l1-u02', 'l2-u01']);
    expect(index.unitById.get('l2-u01')?.title).toBe('Unit 3');
  });

  it('indexes words by id and by level', () => {
    expect(index.words.get('w:我')?.simplified).toBe('我');
    expect(index.wordIdsByLevel.get(1)).toEqual(['w:我', 'w:你']);
    expect(index.wordIdsByLevel.get(2)).toEqual(['w:朋友']);
    expect(index.wordIdsByLevel.get(3)).toEqual([]);
  });
});
