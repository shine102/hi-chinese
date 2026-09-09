import { describe, expect, it } from 'vitest';
import { characterFileName, compareWords, uniqueHanChars, unitId, wordId } from '../src/ids.js';
import type { Word } from '../src/types.js';

describe('ids', () => {
  it('builds word ids from simplified form', () => {
    expect(wordId('爱好')).toBe('w:爱好');
  });
  it('builds zero-padded unit ids', () => {
    expect(unitId(1, 1)).toBe('l1-u01');
    expect(unitId(3, 42)).toBe('l3-u42');
    expect(unitId(2, 105)).toBe('l2-u105');
  });
  it('names character files by hex code point', () => {
    expect(characterFileName('你')).toBe('4f60');
    expect(characterFileName('一')).toBe('4e00');
  });
  it('extracts unique Han characters in order, dropping punctuation and latin', () => {
    expect(uniqueHanChars('你好，你好吗？OK')).toEqual(['你', '好', '吗']);
    expect(uniqueHanChars('')).toEqual([]);
  });
  it('compareWords orders by level, then frequency, then simplified', () => {
    const w = (simplified: string, level: 1 | 2, frequency: number): Word => ({
      id: `w:${simplified}`,
      simplified,
      traditional: simplified,
      pinyin: 'x',
      pinyinNumeric: 'x1',
      meanings: ['x'],
      alternates: [],
      pos: [],
      classifiers: [],
      level,
      frequency,
      characters: [simplified],
      unitId: '',
    });
    const words = [w('你', 1, 5), w('了', 2, 1), w('是', 1, 3), w('我', 1, 2)];
    expect([...words].sort(compareWords).map((x) => x.simplified)).toEqual(['我', '是', '你', '了']);
  });
});
