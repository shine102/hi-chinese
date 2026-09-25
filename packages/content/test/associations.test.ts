import { describe, expect, it } from 'vitest';
import {
  alignSyllables,
  attachAssociations,
  findMissingAssociations,
  indexCedict,
  resolveAssociations,
  tonelessSyllables,
} from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import { makeHanViet } from '../src/pipeline/hanviet.js';
import type { Word } from '../src/types.js';

function w(simplified: string, pinyin: string, hanViet: string, level: 1 | 2 | 3 = 1, pos: string[] = ['d']): Word {
  return {
    id: `w:${simplified}`, simplified, traditional: simplified, pinyin, pinyinNumeric: '', hanViet,
    meanings: ['x'], alternates: [], pos, classifiers: [], level, frequency: 1,
    characters: [...simplified], unitId: 'l1-u01',
  };
}

const words = [w('太', 'tài', 'Thái'), w('太阳', 'tài yang', 'Thái Dương', 2), w('呢', 'ne', 'Ni', 1, ['y']), w('长', 'cháng', 'Trường')];
const hanViet = makeHanViet({ charMap: { 太: 'Thái', 平: 'Bình', 洋: 'Dương', 空: 'Không', 长: 'Trường', 大: 'Đại' }, wordOverrides: {} });
const cvdict = indexCedict(
  parseCedict(
    [
      '太平洋 太平洋 [Tai4 ping2 yang2] /Thái Bình Dương/',
      '太空 太空 [tai4 kong1] /không gian/',
      '長大 长大 [zhang3 da4] /lớn lên/',
      '太極 太极 [tai4 ji2] /thái cực/',
    ].join('\n'),
  ),
);

describe('tonelessSyllables / alignSyllables', () => {
  it('strips tones but keeps ü', () => {
    expect(tonelessSyllables('Tài píng yáng')).toEqual(['tai', 'ping', 'yang']);
    expect(tonelessSyllables('lǜ sè')).toEqual(['lü', 'se']);
  });
  it('folds erhua 儿 into the previous syllable', () => {
    expect(alignSyllables('有空儿', 'yǒu kòngr')).toEqual([
      { char: '有', syllable: 'you', tone: 'yǒu' },
      { char: '空', syllable: 'kong', tone: 'kòng' },
      { char: '儿', syllable: '', tone: '' },
    ]);
    expect(alignSyllables('太阳', 'tài')).toBeNull();
  });
});

describe('resolveAssociations', () => {
  it('fills course words from the course and outside words from CVDICT (lowercased)', () => {
    const { byChar, errors } = resolveAssociations(
      { 太: [{ zh: '太阳', vi: 'mặt trời' }, { zh: '太平洋', vi: 'Thái Bình Dương' }] },
      words, cvdict, hanViet,
    );
    expect(errors).toEqual([]);
    expect(byChar.get('太')).toEqual([
      { zh: '太阳', pinyin: 'tài yang', hanViet: 'Thái Dương', vi: 'mặt trời', wordId: 'w:太阳' },
      { zh: '太平洋', pinyin: 'tài píng yáng', hanViet: 'Thái Bình Dương', vi: 'Thái Bình Dương' },
    ]);
  });
  it('rejects a word whose character reads differently from the taught word', () => {
    const { errors } = resolveAssociations({ 长: [{ zh: '长大', vi: 'lớn lên' }] }, words, cvdict, hanViet);
    expect(errors.map((e) => e.rule)).toEqual(['association-reading']);
  });
  it('rejects unknown words, pinyin on course words, missing Hán Việt, bad keys and too many entries', () => {
    const { errors } = resolveAssociations(
      {
        太: [
          { zh: '太好', vi: 'x' },
          { zh: '太阳', vi: 'mặt trời', pinyin: 'tài yáng' },
          { zh: '太极', vi: 'thái cực' },
          { zh: '太空', vi: 'không gian' },
        ],
        猫: [{ zh: '猫咪', vi: 'mèo' }],
      },
      words, cvdict, hanViet,
    );
    expect(errors.map((e) => e.rule).sort()).toEqual([
      'association-count',
      'association-hanviet',
      'association-key',
      'association-source',
      'association-source',
    ]);
  });
  it('accepts an explicit none with a reason, and nothing else', () => {
    expect(resolveAssociations({ 呢: { none: 'hư từ cuối câu' } }, words, cvdict, hanViet).errors).toEqual([]);
    expect(resolveAssociations({ 呢: { none: ' ' } }, words, cvdict, hanViet).errors.map((e) => e.rule)).toEqual([
      'association-none',
    ]);
  });
});

describe('resolveAssociations Hán Việt guard (polyphone read differently in the course)', () => {
  // 长 is taught as cháng "Trường" (course word 长, and 长城 cháng chéng "Trường Thành"), but its
  // char-map entry here is the OTHER reading, "Trưởng" (as it is in the real char-map, where 长's
  // primary/most-common reading is zhǎng "Trưởng"). A non-course association using 长 with the
  // taught cháng reading must not silently fall back to the char-map's "Trưởng".
  const guardWords = [
    ...words,
    w('长城', 'cháng chéng', 'Trường Thành', 1),
    w('跑', 'pǎo', 'Bào'),
  ];
  const guardHanViet = makeHanViet({
    charMap: { 长: 'Trưởng', 城: 'Thành', 跑: 'Bào' },
    wordOverrides: {},
  });
  const guardCvdict = indexCedict(
    parseCedict(['長跑 长跑 [chang2 pao3] /chạy đường dài/'].join('\n')),
  );

  it('flags a non-course association whose char-map reading differs from the course reading', () => {
    const { errors } = resolveAssociations(
      { 跑: [{ zh: '长跑', vi: 'chạy đường dài' }] },
      guardWords, guardCvdict, guardHanViet,
    );
    expect(errors.map((e) => e.rule)).toEqual(['association-hanviet']);
  });

  it('accepts it once an explicit hanViet is given', () => {
    const { errors } = resolveAssociations(
      { 跑: [{ zh: '长跑', vi: 'chạy đường dài', hanViet: 'Trường Bào' }] },
      guardWords, guardCvdict, guardHanViet,
    );
    expect(errors).toEqual([]);
  });
});

describe('attachAssociations / findMissingAssociations', () => {
  it('attaches lists to single-character words only and reports gaps per level', () => {
    const { byChar } = resolveAssociations(
      { 太: [{ zh: '太阳', vi: 'mặt trời' }, { zh: '太空', vi: 'không gian' }], 呢: { none: 'hư từ' } },
      words, cvdict, hanViet,
    );
    const out = attachAssociations(words, byChar);
    expect(out[0]!.associations?.map((a) => a.zh)).toEqual(['太阳', '太空']);
    expect(out[2]!.associations).toBeUndefined();
    expect(findMissingAssociations(out, byChar, [1])).toEqual(['长']);
  });
  it('does not report a word with exactly one association', () => {
    const { byChar } = resolveAssociations({ 太: [{ zh: '太阳', vi: 'mặt trời' }] }, words, cvdict, hanViet);
    expect(byChar.get('太')).toHaveLength(1);
    expect(findMissingAssociations(words, byChar, [1])).not.toContain('太');
  });
});
