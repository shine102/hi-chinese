import { describe, expect, it } from 'vitest';
import { characterFileName, uniqueHanChars, unitId, wordId } from '../src/ids.js';

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
});
