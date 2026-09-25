import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildManifest, computeVersion, writeContent } from '../src/pipeline/build.js';
import type { ContentBundle } from '../src/types.js';

function bundle(): ContentBundle {
  return {
    units: [
      {
        id: 'l1-u01',
        level: 1,
        order: 1,
        title: 'Unit 1',
        wordIds: ['w:我', 'w:是'],
        grammarIds: ['g1'],
        sentenceIds: ['s1'],
      },
      {
        id: 'l2-u01',
        level: 2,
        order: 2,
        title: 'Unit 1',
        wordIds: ['w:你'],
        grammarIds: [],
        sentenceIds: [],
      },
    ],
    words: [
      {
        id: 'w:我',
        simplified: '我',
        traditional: '我',
        pinyin: 'wǒ',
        pinyinNumeric: 'wo3',
        hanViet: 'Ngã',
        meanings: ['I'],
        alternates: [],
        pos: ['r'],
        classifiers: [],
        level: 1,
        frequency: 3,
        characters: ['我'],
        unitId: 'l1-u01',
      },
      {
        id: 'w:是',
        simplified: '是',
        traditional: '是',
        pinyin: 'shì',
        pinyinNumeric: 'shi4',
        hanViet: 'Thị',
        meanings: ['to be'],
        alternates: [],
        pos: ['v'],
        classifiers: [],
        level: 1,
        frequency: 4,
        characters: ['是'],
        unitId: 'l1-u01',
      },
      {
        id: 'w:你',
        simplified: '你',
        traditional: '你',
        pinyin: 'nǐ',
        pinyinNumeric: 'ni3',
        hanViet: 'Nễ',
        meanings: ['you'],
        alternates: [],
        pos: ['r'],
        classifiers: [],
        level: 2,
        frequency: 5,
        characters: ['你'],
        unitId: 'l2-u01',
      },
    ],
    characters: ['我', '是', '你'].map((c) => ({
      character: c,
      strokes: ['M 0 0'],
      medians: [[[0, 0]]],
      pinyin: [],
      hanViet: 'X',
      definition: null,
      radical: '',
      decomposition: '',
      wordIds: [`w:${c}`],
      gloss: '',
      associations: [],
    })),
    grammar: [
      {
        id: 'g1',
        title: 't',
        pattern: 'p',
        explanation: 'e',
        level: 1,
        sentenceIds: ['s1'],
        unitId: 'l1-u01',
      },
    ],
    sentences: [
      {
        id: 's1',
        zh: '我是。',
        pinyin: 'Wǒ shì.',
        vi: 'I am.',
        wordIds: ['w:我', 'w:是'],
        unitId: 'l1-u01',
      },
    ],
  };
}

describe('computeVersion', () => {
  it('is deterministic and 12 hex chars', () => {
    expect(computeVersion(['a', 'b'])).toMatch(/^[0-9a-f]{12}$/);
    expect(computeVersion(['a', 'b'])).toBe(computeVersion(['a', 'b']));
    expect(computeVersion(['a', 'b'])).not.toBe(computeVersion(['a', 'c']));
  });
});

describe('buildManifest', () => {
  it('summarizes levels, units and counts', () => {
    const m = buildManifest(bundle(), 'abc', '2026-09-09T00:00:00.000Z');
    expect(m).toEqual({
      version: 'abc',
      generatedAt: '2026-09-09T00:00:00.000Z',
      levels: [
        { level: 1, title: 'HSK 1', unitIds: ['l1-u01'] },
        { level: 2, title: 'HSK 2', unitIds: ['l2-u01'] },
      ],
      units: [
        { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 2, grammarCount: 1 },
        { id: 'l2-u01', level: 2, order: 2, title: 'Unit 1', wordCount: 1, grammarCount: 0 },
      ],
      characters: ['4f60', '6211', '662f'],
      counts: { words: 3, characters: 3, grammar: 1, sentences: 1, units: 2 },
    });
  });
});

describe('writeContent', () => {
  let dir: string;
  beforeEach(async () => {
    dir = join(await mkdtemp(join(tmpdir(), 'hi-chinese-build-')), 'content');
  });
  afterEach(async () => {
    await rm(join(dir, '..'), { recursive: true, force: true });
  });

  it('writes manifest, words, unit chunks and character chunks', async () => {
    const manifest = await writeContent(bundle(), dir, () => new Date('2026-09-09T00:00:00.000Z'));
    expect((await readdir(dir)).sort()).toEqual([
      'ATTRIBUTION.txt',
      'characters',
      'manifest.json',
      'units',
      'words.json',
    ]);
    expect((await readdir(join(dir, 'units'))).sort()).toEqual(['l1-u01.json', 'l2-u01.json']);
    expect((await readdir(join(dir, 'characters'))).sort()).toEqual([
      '4f60.json',
      '6211.json',
      '662f.json',
    ]);
    const chunk = JSON.parse(await readFile(join(dir, 'units', 'l1-u01.json'), 'utf8'));
    expect(chunk.unit.id).toBe('l1-u01');
    expect(chunk.grammar.map((g: { id: string }) => g.id)).toEqual(['g1']);
    const attribution = await readFile(join(dir, 'ATTRIBUTION.txt'), 'utf8');
    expect(attribution).toContain('CVDICT');
    expect(attribution).toContain('CC BY-SA');
    expect(chunk.sentences.map((s: { id: string }) => s.id)).toEqual(['s1']);
    const words = JSON.parse(await readFile(join(dir, 'words.json'), 'utf8'));
    expect(words.map((w: { id: string }) => w.id)).toEqual(['w:我', 'w:是', 'w:你']);
    const onDisk = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
    expect(onDisk).toEqual(manifest);
    expect(manifest.generatedAt).toBe('2026-09-09T00:00:00.000Z');
  });

  it('produces the same version for the same content and replaces stale files', async () => {
    const first = await writeContent(bundle(), dir);
    await writeFile(join(dir, 'units', 'stale.json'), '{}', 'utf8');
    const second = await writeContent(bundle(), dir);
    expect(second.version).toBe(first.version);
    expect((await readdir(join(dir, 'units'))).sort()).toEqual(['l1-u01.json', 'l2-u01.json']);
    const b = bundle();
    b.sentences[0]!.vi = 'I am!';
    const third = await writeContent(b, dir);
    expect(third.version).not.toBe(first.version);
  });

  it('keeps generatedAt when the content version is unchanged, so rebuilds leave no diff', async () => {
    const first = await writeContent(bundle(), dir, () => new Date('2026-09-09T00:00:00.000Z'));
    const again = await writeContent(bundle(), dir, () => new Date('2026-09-10T00:00:00.000Z'));
    expect(again.generatedAt).toBe(first.generatedAt);
    const b = bundle();
    b.sentences[0]!.vi = 'I am!';
    const changed = await writeContent(b, dir, () => new Date('2026-09-11T00:00:00.000Z'));
    expect(changed.generatedAt).toBe('2026-09-11T00:00:00.000Z');
  });

  it('refuses an output directory not named content', async () => {
    await expect(writeContent(bundle(), join(dir, '..'))).rejects.toThrow(/content/);
  });
});
