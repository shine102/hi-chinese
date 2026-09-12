import { describe, expect, it } from 'vitest';
import { matchWordMeanings, matchCharDefinition } from '../scripts/seed-vietnamese.js';
import type { CedictEntry } from '../src/pipeline/cedict.js';

const byWord = new Map<string, CedictEntry[]>([
  ['你好', [{ traditional: '你好', simplified: '你好', pinyin: 'ni3 hao3', meanings: ['xin chào', 'chào'] }]],
  ['的', [
    { traditional: '的', simplified: '的', pinyin: 'de5', meanings: ['của'] },
    { traditional: '的', simplified: '的', pinyin: 'di1', meanings: ['xe taxi'] },
    { traditional: '的', simplified: '的', pinyin: 'di2', meanings: ['thực sự'] },
    { traditional: '的', simplified: '的', pinyin: 'di4', meanings: ['hồng tâm; mục tiêu'] },
  ]],
  ['女', [
    { traditional: '女', simplified: '女', pinyin: 'nu:3', meanings: ['nữ', 'phụ nữ', 'con gái'] },
    { traditional: '女', simplified: '女', pinyin: 'ru3', meanings: ['biến thể cổ của 汝'] },
  ]],
]);

describe('matchWordMeanings', () => {
  it('returns the single match directly', () => {
    const r = matchWordMeanings({ simplified: '你好', pinyinNumeric: 'ni3 hao3' }, byWord);
    expect(r).toEqual({ meanings: ['xin chào', 'chào'], ambiguous: false });
  });

  it('picks the heteronym line matching the course pinyinNumeric', () => {
    const r = matchWordMeanings({ simplified: '的', pinyinNumeric: 'de5' }, byWord);
    expect(r).toEqual({ meanings: ['của'], ambiguous: false });
  });

  it('normalizes CEDICT u: to ü before comparing', () => {
    const r = matchWordMeanings({ simplified: '女', pinyinNumeric: 'nü3' }, byWord);
    expect(r).toEqual({ meanings: ['nữ', 'phụ nữ', 'con gái'], ambiguous: false });
  });

  it('falls back to a concatenated, flagged result when no heteronym line matches', () => {
    const r = matchWordMeanings({ simplified: '的', pinyinNumeric: 'de2' }, byWord);
    expect(r.ambiguous).toBe(true);
    expect(r.meanings).not.toBeNull();
    expect(r.meanings!.length).toBeGreaterThan(0);
  });

  it('returns null meanings when the word is not in CEDICT at all', () => {
    const r = matchWordMeanings({ simplified: '送到', pinyinNumeric: 'song4 dao4' }, byWord);
    expect(r).toEqual({ meanings: null, ambiguous: false });
  });

  it('prefers a real-content entry over a same-pinyin variant-of stub (时)', () => {
    const byShi = new Map<string, CedictEntry[]>([
      ['时', [
        { traditional: '旹', simplified: '时', pinyin: 'shi2', meanings: ['biến thể cũ của 時|时[shi2]'] },
        { traditional: '時', simplified: '时', pinyin: 'Shi2', meanings: ['họ [Shi2]'] },
        { traditional: '時', simplified: '时', pinyin: 'shi2', meanings: ['giờ', 'thời gian', 'khi', 'mùa', 'giai đoạn'] },
      ]],
    ]);
    const r = matchWordMeanings({ simplified: '时', pinyinNumeric: 'shi2' }, byShi);
    expect(r).toEqual({
      meanings: ['giờ', 'thời gian', 'khi', 'mùa', 'giai đoạn'],
      ambiguous: false,
    });
  });

  it('flags ambiguous when more than one same-pinyin entry has real content', () => {
    const byLi = new Map<string, CedictEntry[]>([
      ['里', [
        { traditional: '裏', simplified: '里', pinyin: 'li3', meanings: ['biến thể của 裡|里[li3]'] },
        { traditional: '裡', simplified: '里', pinyin: 'li3', meanings: ['lót', 'bên trong', 'phía trong'] },
        { traditional: '里', simplified: '里', pinyin: 'li3', meanings: ['dặm', 'khu xóm'] },
      ]],
    ]);
    const r = matchWordMeanings({ simplified: '里', pinyinNumeric: 'li3' }, byLi);
    expect(r.ambiguous).toBe(true);
    expect(r.meanings).toEqual(['lót', 'bên trong', 'phía trong', 'dặm', 'khu xóm']);
  });
});

describe('matchCharDefinition', () => {
  it('matches a character by converting its tone-marked pinyin and comparing', () => {
    const byChar = new Map<string, CedictEntry[]>([
      ['见', [
        { traditional: '見', simplified: '见', pinyin: 'jian4', meanings: ['thấy', 'gặp'] },
        { traditional: '見', simplified: '见', pinyin: 'xian4', meanings: ['xuất hiện'] },
      ]],
    ]);
    const r = matchCharDefinition({ character: '见', pinyin: ['jiàn'] }, byChar);
    expect(r).toEqual({ definition: 'thấy, gặp', ambiguous: false });
  });

  it('prefers the real definition over same-pinyin variant-of stubs (只)', () => {
    const byChar = new Map<string, CedictEntry[]>([
      ['只', [
        { traditional: '只', simplified: '只', pinyin: 'zhi3', meanings: ['chỉ', 'chỉ đơn thuần', 'chỉ là', 'nhưng'] },
        { traditional: '祇', simplified: '只', pinyin: 'zhi3', meanings: ['biến thể của 只[zhi3]'] },
        { traditional: '秖', simplified: '只', pinyin: 'zhi1', meanings: ['hạt bắt đầu chín'] },
        { traditional: '衹', simplified: '只', pinyin: 'zhi3', meanings: ['biến thể của 只[zhi3]'] },
        { traditional: '隻', simplified: '只', pinyin: 'zhi1', meanings: ['lượng từ cho chim và một số động vật'] },
      ]],
    ]);
    const r = matchCharDefinition({ character: '只', pinyin: ['zhǐ'] }, byChar);
    expect(r).toEqual({ definition: 'chỉ, chỉ đơn thuần, chỉ là, nhưng', ambiguous: false });
  });
});
