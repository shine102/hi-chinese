import { describe, expect, it } from 'vitest';
import {
  chooseReading,
  hskLevelOf,
  mergeForms,
  normalizeWord,
  parseHskWords,
  type RawHskEntry,
  type RawHskForm,
} from '../src/pipeline/hsk.js';

const hanViet = { char: () => 'X', word: () => 'X X' };

const form = (numeric: string, pinyin: string, meanings: string[]): RawHskForm => ({
  traditional: 'X',
  transcriptions: { pinyin, numeric },
  meanings,
  classifiers: [],
});

const shuo: RawHskEntry = {
  simplified: '说',
  radical: '讠',
  level: ['new-1', 'old-1'],
  frequency: 46,
  pos: ['v'],
  forms: [
    form('shui4', 'shuì', ['to persuade']),
    form('shuo1', 'shuō', ['to speak', 'to say', 'to explain', 'to scold']),
    form('shuo1', 'shuō', ['variant of 說']),
  ],
};

const ye: RawHskEntry = {
  simplified: '也',
  radical: '乙',
  level: ['new-1'],
  frequency: 130,
  pos: ['d'],
  forms: [form('Ye3', 'Yě', ['surname Ye']), form('ye3', 'yě', ['also', 'too'])],
};

const le: RawHskEntry = {
  simplified: '了',
  radical: '乙',
  level: ['new-1'],
  frequency: 2,
  forms: [
    form('le5', 'le', ['(completed action marker)', '(modal particle)', '(change of state)']),
    form('liao3', 'liǎo', ['to finish', 'to settle', 'to understand', 'clear']),
  ],
};

const aihao: RawHskEntry = {
  simplified: '爱好',
  radical: '爫',
  level: ['new-1', 'old-3'],
  frequency: 4902,
  pos: ['n', 'v'],
  forms: [
    {
      traditional: '愛好',
      transcriptions: { pinyin: 'ài hào', numeric: 'ai4 hao4' },
      meanings: ['to like; to be fond of', 'interest; hobby'],
      classifiers: ['个'],
    },
  ],
};

const levelFour: RawHskEntry = { ...aihao, simplified: '抽象', level: ['new-4'] };

describe('hskLevelOf', () => {
  it('returns the lowest new-N level within 1..3', () => {
    expect(hskLevelOf(shuo)).toBe(1);
    expect(hskLevelOf({ ...shuo, level: ['new-3', 'new-2', 'old-6'] })).toBe(2);
  });
  it('returns null for words outside levels 1-3', () => {
    expect(hskLevelOf(levelFour)).toBeNull();
    expect(hskLevelOf({ ...shuo, level: ['old-1'] })).toBeNull();
  });
});

describe('mergeForms', () => {
  it('merges forms sharing the same numeric pinyin and dedupes meanings', () => {
    const merged = mergeForms(shuo.forms);
    expect(merged.map((f) => f.transcriptions.numeric)).toEqual(['shui4', 'shuo1']);
    expect(merged[1]!.meanings).toEqual([
      'to speak',
      'to say',
      'to explain',
      'to scold',
      'variant of 說',
    ]);
  });
});

describe('chooseReading', () => {
  it('prefers the reading with the most substantive meanings', () => {
    expect(chooseReading(shuo, {}).chosen.transcriptions.numeric).toBe('shuo1');
  });
  it('penalizes capitalized (proper noun) readings', () => {
    expect(chooseReading(ye, {}).chosen.transcriptions.numeric).toBe('ye3');
  });
  it('lets an override win', () => {
    expect(chooseReading(le, {}).chosen.transcriptions.numeric).toBe('liao3');
    const r = chooseReading(le, { 了: 'le5' });
    expect(r.chosen.transcriptions.numeric).toBe('le5');
    expect(r.others.map((f) => f.transcriptions.numeric)).toEqual(['liao3']);
  });
  it('throws a helpful error when an override does not match any form', () => {
    expect(() => chooseReading(le, { 了: 'le4' })).toThrow(/了.*le4.*le5, liao3/);
  });
});

describe('normalizeWord', () => {
  it('produces a Word with chosen reading, alternates, characters and empty unitId', () => {
    const w = normalizeWord(le, { 了: 'le5' }, hanViet)!;
    expect(w).toMatchObject({
      id: 'w:了',
      simplified: '了',
      traditional: 'X',
      pinyin: 'le',
      pinyinNumeric: 'le5',
      level: 1,
      frequency: 2,
      pos: [],
      classifiers: [],
      characters: ['了'],
      unitId: '',
    });
    expect(w.meanings).toHaveLength(3);
    expect(w.alternates).toEqual([
      {
        pinyin: 'liǎo',
        pinyinNumeric: 'liao3',
        meanings: ['to finish', 'to settle', 'to understand', 'clear'],
      },
    ]);
  });
  it('keeps classifiers and multi-character words', () => {
    const w = normalizeWord(aihao, {}, hanViet)!;
    expect(w.classifiers).toEqual(['个']);
    expect(w.characters).toEqual(['爱', '好']);
    expect(w.traditional).toBe('愛好');
  });
  it('returns null outside levels 1-3', () => {
    expect(normalizeWord(levelFour, {}, hanViet)).toBeNull();
  });
});

describe('parseHskWords', () => {
  it('filters, dedupes by simplified, and sorts by level, frequency, simplified', () => {
    const words = parseHskWords(
      [levelFour, aihao, shuo, { ...shuo }, le, { ...ye, level: ['new-2'] }],
      {},
      hanViet,
    );
    expect(words.map((w) => w.simplified)).toEqual(['了', '说', '爱好', '也']);
  });
});
