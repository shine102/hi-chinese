import { describe, expect, it } from 'vitest';
import {
  attachParts,
  buildParts,
  findMissingGlosses,
  formatGloss,
  glossFor,
  validateGlosses,
} from '../src/pipeline/glosses.js';
import { makeHanViet } from '../src/pipeline/hanviet.js';
import type { Word } from '../src/types.js';

function w(simplified: string, pinyin: string, hanViet: string): Word {
  return {
    id: `w:${simplified}`, simplified, traditional: simplified, pinyin, pinyinNumeric: '', hanViet,
    meanings: ['x'], alternates: [], pos: [], classifiers: [], level: 1, frequency: 1,
    characters: [...simplified], unitId: 'l1-u01',
  };
}
const hanViet = makeHanViet({ charMap: { 银: 'Ngân', 行: 'Hành', 太: 'Thái', 阳: 'Dương', 有: 'Hữu', 空: 'Không', 儿: 'Nhi' }, wordOverrides: { 银行: 'Ngân Hàng' } });
const glosses = { 银: 'bạc', 行: { xíng: 'đi; được', háng: 'hàng; dãy' }, 太: 'to lớn; quá', 阳: 'mặt trời; dương' };

describe('glossFor / formatGloss', () => {
  it('picks the reading-specific gloss of a polyphone', () => {
    expect(glossFor(glosses.行, 'hang')).toBe('hàng; dãy');
    expect(glossFor(glosses.行, 'xing')).toBe('đi; được');
    expect(glossFor(glosses.行, 'heng')).toBe('');
    expect(glossFor('bạc', 'yin')).toBe('bạc');
    expect(formatGloss(glosses.行)).toBe('xíng: đi; được · háng: hàng; dãy');
    expect(formatGloss(undefined)).toBe('');
  });
  it('disambiguates tone-only polyphones by tone, falling back to the unique toneless match', () => {
    const hao = { hǎo: 'tốt', hào: 'thích' };
    expect(glossFor(hao, 'hao', 'hào')).toBe('thích');
    expect(glossFor(hao, 'hao', 'hǎo')).toBe('tốt');
    expect(glossFor(hao, 'hao', '')).toBe('');
    expect(glossFor({ xíng: 'đi', háng: 'hàng' }, 'hang', 'hang')).toBe('hàng');
  });
});

describe('buildParts', () => {
  it('uses the word-level Hán Việt split and the reading-specific gloss', () => {
    const parts = buildParts(w('银行', 'yín háng', 'Ngân Hàng'), glosses, new Map([['行', 'w:行']]), hanViet);
    expect(parts).toEqual([
      { char: '银', hanViet: 'Ngân', gloss: 'bạc' },
      { char: '行', hanViet: 'Hàng', gloss: 'hàng; dãy', wordId: 'w:行' },
    ]);
  });
  it('handles erhua and missing glosses', () => {
    const parts = buildParts(w('有空儿', 'yǒu kòngr', 'Hữu Không Nhi'), {}, new Map(), hanViet);
    expect(parts.map((p) => [p.char, p.hanViet, p.gloss])).toEqual([
      ['有', 'Hữu', ''],
      ['空', 'Không', ''],
      ['儿', 'Nhi', ''],
    ]);
  });
  it('picks the tone-specific gloss for a word like 爱好 (ài hào)', () => {
    const parts = buildParts(
      w('爱好', 'ài hào', 'Ái Hiếu'),
      { ...glosses, 好: { hǎo: 'tốt', hào: 'thích' } },
      new Map(),
      hanViet,
    );
    expect(parts.map((p) => p.gloss)).toEqual(['', 'thích']);
  });
  it('attaches parts to multi-character words only', () => {
    const out = attachParts([w('太', 'tài', 'Thái'), w('太阳', 'tài yang', 'Thái Dương')], glosses, hanViet);
    expect(out[0]!.parts).toBeUndefined();
    expect(out[1]!.parts).toEqual([
      { char: '太', hanViet: 'Thái', gloss: 'to lớn; quá', wordId: 'w:太' },
      { char: '阳', hanViet: 'Dương', gloss: 'mặt trời; dương' },
    ]);
  });
});

describe('validateGlosses / findMissingGlosses', () => {
  it('flags unknown chars, long glosses and malformed polyphone maps', () => {
    const errors = validateGlosses(
      { 太: 'to lớn; quá', 猫: 'mèo', 阳: 'một thứ gì đó rất dài dòng', 行: { xíng: 'đi' }, 银: '' },
      new Set(['太', '阳', '行', '银']),
    );
    expect(errors.map((e) => `${e.rule}:${e.ref}`).sort()).toEqual([
      'char-gloss-key:猫',
      'char-gloss:行',
      'char-gloss:银',
      'char-gloss:阳',
    ]);
  });
  it('lists course characters without a gloss', () => {
    expect(findMissingGlosses(['太', '阳', '猫'], glosses)).toEqual(['猫']);
  });
});
