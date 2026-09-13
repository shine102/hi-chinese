import { describe, expect, it } from 'vitest';
import {
  normalizeCedictPinyin,
  parseCedict,
  parseCedictLine,
  pinyinSyllableToNumeric,
  pinyinToNumeric,
} from '../src/pipeline/cedict.js';

describe('parseCedictLine', () => {
  it('parses a data line into traditional/simplified/pinyin/meanings', () => {
    const line = '你好 你好 [ni3 hao3] /xin chào/chào/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '你好',
      simplified: '你好',
      pinyin: 'ni3 hao3',
      meanings: ['xin chào', 'chào'],
    });
  });

  it('returns null for comment lines and blank lines', () => {
    expect(parseCedictLine('# a comment')).toBeNull();
    expect(parseCedictLine('')).toBeNull();
    expect(parseCedictLine('   ')).toBeNull();
  });

  it('returns null for a line that does not match the CEDICT shape', () => {
    expect(parseCedictLine('not a cedict line')).toBeNull();
  });

  it('filters out CVDICT classifier ("LT:") annotations from meanings', () => {
    // Real CVDICT.u8 line for 朋友.
    const line = '朋友 朋友 [peng2 you5] /bạn/LT:個|个[ge4],位[wei4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '朋友',
      simplified: '朋友',
      pinyin: 'peng2 you5',
      meanings: ['bạn'],
    });
  });

  it('filters a classifier annotation even when another sense follows it', () => {
    // Real CVDICT.u8 line for 下午: "p.m." appears as a genuine sense after LT:.
    const line = '下午 下午 [xia4 wu3] /buổi chiều/LT:個|个[ge4]/p.m./';
    expect(parseCedictLine(line)).toEqual({
      traditional: '下午',
      simplified: '下午',
      pinyin: 'xia4 wu3',
      meanings: ['buổi chiều', 'p.m.'],
    });
  });

  it('filters a classifier annotation with a space after the colon', () => {
    // Real CVDICT.u8 line for 丈夫: "LT: 個|个[ge4]" has a space after "LT:".
    const line = '丈夫 丈夫 [zhang4 fu5] /chồng/LT: 個|个[ge4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '丈夫',
      simplified: '丈夫',
      pinyin: 'zhang4 fu5',
      meanings: ['chồng'],
    });
  });

  it('filters the spelled-out "Lượng từ:" classifier annotation', () => {
    // Real CVDICT.u8 line for 血 (packages/content/raw/CVDICT.u8:95905).
    const line = '血 血 [xue4] /máu/khẩu ngữ đọc là [xie3]/Lượng từ: 滴[di1],片[pian4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '血',
      simplified: '血',
      pinyin: 'xue4',
      meanings: ['máu', 'khẩu ngữ đọc là [xie3]'],
    });
  });

  it('filters both a "Lượng từ:" annotation and a "Bộ Khang Hy số" radical annotation', () => {
    // Real CVDICT.u8 line for 衣 (packages/content/raw/CVDICT.u8:96373).
    const line = '衣 衣 [yi1] /quần áo/Lượng từ: 件[jian4]/Bộ Khang Hy số 145/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '衣',
      simplified: '衣',
      pinyin: 'yi1',
      meanings: ['quần áo'],
    });
  });

  it('filters a lowercase "lượng từ:" annotation whose classifier list contains an internal comma', () => {
    // Real CVDICT.u8 line for 腳/脚 (packages/content/raw/CVDICT.u8:89226). The
    // "lượng từ: 雙|双[shuang1], 隻|只[zhi1]" sense has an internal ", " — this
    // must be dropped as one whole slash-delimited sense, not re-split on ", ".
    const line =
      '腳 脚 [jiao3] /bàn chân/chân (của động vật hoặc đồ vật)/đế, chân (của đồ vật)/lượng từ: 雙|双[shuang1], 隻|只[zhi1]/lượng từ cho cú đá/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '腳',
      simplified: '脚',
      pinyin: 'jiao3',
      meanings: [
        'bàn chân',
        'chân (của động vật hoặc đồ vật)',
        'đế, chân (của đồ vật)',
        'lượng từ cho cú đá',
      ],
    });
  });
});

describe('parseCedict', () => {
  it('parses multiple lines, skipping comments', () => {
    const text = [
      '# header comment',
      '你好 你好 [ni3 hao3] /xin chào/chào/',
      '謝謝 谢谢 [xie4 xie5] /cảm ơn/cảm ơn bạn/',
    ].join('\n');
    const out = parseCedict(text);
    expect(out).toHaveLength(2);
    expect(out[0]!.simplified).toBe('你好');
    expect(out[1]!.meanings).toEqual(['cảm ơn', 'cảm ơn bạn']);
  });
});

describe('normalizeCedictPinyin', () => {
  it('converts CEDICT u: convention to ü', () => {
    expect(normalizeCedictPinyin('nu:3')).toBe('nü3');
    expect(normalizeCedictPinyin('lu:4 mao4 zi5')).toBe('lü4 mao4 zi5');
  });

  it('leaves non-ü pinyin unchanged', () => {
    expect(normalizeCedictPinyin('qu4')).toBe('qu4');
  });
});

describe('pinyinSyllableToNumeric', () => {
  it('converts each tone-marked vowel to its numeric form', () => {
    expect(pinyinSyllableToNumeric('nǐ')).toBe('ni3');
    expect(pinyinSyllableToNumeric('hǎo')).toBe('hao3');
    expect(pinyinSyllableToNumeric('mā')).toBe('ma1');
  });

  it('converts precomposed ü-tone vowels, keeping ü', () => {
    expect(pinyinSyllableToNumeric('nǚ')).toBe('nü3');
    expect(pinyinSyllableToNumeric('lǜ')).toBe('lü4');
  });

  it('defaults to neutral tone 5 when there is no diacritic', () => {
    expect(pinyinSyllableToNumeric('ma')).toBe('ma5');
    expect(pinyinSyllableToNumeric('zi')).toBe('zi5');
  });
});

describe('pinyinToNumeric', () => {
  it('converts a full multi-syllable pinyin string', () => {
    expect(pinyinToNumeric('nǐ hǎo')).toBe('ni3 hao3');
    expect(pinyinToNumeric('lǜ')).toBe('lü4');
  });
});
