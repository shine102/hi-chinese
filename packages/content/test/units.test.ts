import { describe, expect, it } from 'vitest';
import { assignUnits } from '../src/pipeline/units.js';
import type { AuthoredUnit, HskLevel, Word } from '../src/types.js';

const mk = (simplified: string, level: HskLevel, frequency: number): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  hanViet: 'X',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level,
  frequency,
  characters: [...simplified],
  unitId: '',
});

// 7 level-1 words, 3 level-2 words, sorted by level then frequency
const words = [
  ...['甲', '乙', '丙', '丁', '戊', '己', '庚'].map((s, i) => mk(s, 1, i + 1)),
  ...['子', '丑', '寅'].map((s, i) => mk(s, 2, i + 1)),
];

describe('assignUnits', () => {
  it('chunks each level into units of wordsPerUnit with global order', () => {
    const { units } = assignUnits(words, [], { wordsPerUnit: 3, minLastUnit: 1 });
    expect(units.map((u) => [u.id, u.level, u.order, u.wordIds.length])).toEqual([
      ['l1-u01', 1, 1, 3],
      ['l1-u02', 1, 2, 3],
      ['l1-u03', 1, 3, 1],
      ['l2-u01', 2, 4, 3],
    ]);
    expect(units[0]!.wordIds).toEqual(['w:甲', 'w:乙', 'w:丙']);
    expect(units[0]!.title).toBe('Unit 1');
    expect(units[0]!.grammarIds).toEqual([]);
    expect(units[0]!.sentenceIds).toEqual([]);
  });

  it('merges a too-small final chunk into the previous unit', () => {
    const { units } = assignUnits(words, [], { wordsPerUnit: 3, minLastUnit: 2 });
    expect(units.map((u) => [u.id, u.wordIds.length])).toEqual([
      ['l1-u01', 3],
      ['l1-u02', 4],
      ['l2-u01', 3],
    ]);
  });

  it('sets unitId on returned word copies without mutating input', () => {
    const { words: out } = assignUnits(words, [], { wordsPerUnit: 3, minLastUnit: 1 });
    expect(out.find((w) => w.simplified === '丁')!.unitId).toBe('l1-u02');
    expect(out.find((w) => w.simplified === '寅')!.unitId).toBe('l2-u01');
    expect(words[0]!.unitId).toBe('');
  });

  it('uses defaults of 12 words per unit and a minimum last unit of 6', () => {
    const many = Array.from({ length: 29 }, (_, i) =>
      mk(String.fromCodePoint(0x4e00 + i), 1, i + 1),
    );
    const { units } = assignUnits(many, []);
    expect(units.map((u) => u.wordIds.length)).toEqual([12, 17]);
  });

  it('builds a level from authored units and keeps chunk fallback for other levels', () => {
    const authoredUnits: AuthoredUnit[] = [
      { id: 'l1-u01', level: 1, order: 1, title: 'Greetings', words: ['乙', '甲'] },
      { id: 'l1-u02', level: 1, order: 2, title: 'People', words: ['丙', '丁', '戊', '己', '庚'] },
    ];
    const { units } = assignUnits(words, authoredUnits, { wordsPerUnit: 3, minLastUnit: 1 });
    expect(units.map((u) => [u.id, u.level, u.order, u.title, u.wordIds])).toEqual([
      ['l1-u01', 1, 1, 'Greetings', ['w:乙', 'w:甲']],
      ['l1-u02', 1, 2, 'People', ['w:丙', 'w:丁', 'w:戊', 'w:己', 'w:庚']],
      ['l2-u01', 2, 3, 'Unit 1', ['w:子', 'w:丑', 'w:寅']],
    ]);
  });

  it('sets unitId from authored membership', () => {
    const authoredUnits: AuthoredUnit[] = [
      { id: 'l1-u01', level: 1, order: 1, title: 'A', words: ['甲', '乙', '丙', '丁', '戊', '己', '庚'] },
    ];
    const { words: out } = assignUnits(words, authoredUnits, { wordsPerUnit: 3, minLastUnit: 1 });
    expect(out.find((w) => w.simplified === '甲')!.unitId).toBe('l1-u01');
    expect(out.find((w) => w.simplified === '寅')!.unitId).toBe('l2-u01');
  });

  it('throws when an authored unit references an unknown word', () => {
    const authoredUnits: AuthoredUnit[] = [
      { id: 'l1-u01', level: 1, order: 1, title: 'A', words: ['甲', '不存在'] },
    ];
    expect(() => assignUnits(words, authoredUnits)).toThrow(/不存在/);
  });
});
