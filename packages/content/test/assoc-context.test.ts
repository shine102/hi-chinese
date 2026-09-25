import { describe, expect, it } from 'vitest';
import { cvdictCandidates, isLabelOnlyMeaning, singleCharWordsInOrder } from '../src/pipeline/assoc-context.js';
import { indexCedict } from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import type { Unit, Word } from '../src/types.js';

const word = (simplified: string, unitId: string, level: 1 | 2 | 3 = 1): Word => ({
  id: `w:${simplified}`, simplified, traditional: simplified, pinyin: 'x', pinyinNumeric: '', hanViet: '',
  meanings: ['x'], alternates: [], pos: [], classifiers: [], level, frequency: 1, characters: [...simplified], unitId,
});
const unit = (id: string, order: number, wordIds: string[]): Unit => ({ id, level: 1, order, title: id, wordIds, grammarIds: [], sentenceIds: [] });

describe('singleCharWordsInOrder', () => {
  it('orders single-character words by unit order then position', () => {
    const words = [word('好', 'u2'), word('你', 'u1'), word('你好', 'u2'), word('我', 'u1')];
    const units = [unit('u2', 2, ['w:你好', 'w:好']), unit('u1', 1, ['w:我', 'w:你'])];
    expect(singleCharWordsInOrder(words, units, 1).map((w) => w.simplified)).toEqual(['我', '你', '好']);
  });
});

describe('cvdictCandidates', () => {
  it('keeps same-reading 2–4 character words, course words first', () => {
    const cvdict = indexCedict(
      parseCedict(
        [
          '太空 太空 [tai4 kong1] /không gian/',
          '太陽 太阳 [tai4 yang5] /mặt trời/',
          '大 大 [da4] /to/',
          '太平洋 太平洋 [Tai4 ping2 yang2] /Thái Bình Dương/',
          '泰 泰 [tai4] /x/',
        ].join('\n'),
      ),
    );
    const got = cvdictCandidates('太', 'tai', cvdict, new Set(['太阳']));
    expect(got.map((c) => [c.zh, c.inCourse])).toEqual([
      ['太阳', true],
      ['太空', false],
      ['太平洋', false],
    ]);
  });
});

describe('isLabelOnlyMeaning', () => {
  it('flags pure labels and bound-form prefixes, not real senses', () => {
    expect(isLabelOnlyMeaning('(phó từ mức độ)')).toBe(true);
    expect(isLabelOnlyMeaning('(hình thức kết hợp) trên; phía trên')).toBe(true);
    expect(isLabelOnlyMeaning('(bị) đau; nhức')).toBe(false);
    expect(isLabelOnlyMeaning('rất')).toBe(false);
  });
});
