import { describe, expect, it } from 'vitest';
import { makeHanViet } from '../src/pipeline/hanviet.js';

const data = {
  charMap: { 再: 'Tái', 见: 'Kiến', 谢: 'Tạ', 银: 'Ngân', 行: 'Hành' },
  wordOverrides: { 银行: 'Ngân Hàng' },
};

describe('makeHanViet', () => {
  const hv = makeHanViet(data);

  it('returns a character reading', () => {
    expect(hv.char('见')).toBe('Kiến');
  });

  it('returns empty string for an unknown character', () => {
    expect(hv.char('猫')).toBe('');
  });

  it('joins character readings with a space, preserving duplicates', () => {
    expect(hv.word('再见')).toBe('Tái Kiến');
    expect(hv.word('谢谢')).toBe('Tạ Tạ');
  });

  it('applies a word override', () => {
    expect(hv.word('银行')).toBe('Ngân Hàng');
  });

  it('returns empty string when a constituent character is unknown and there is no override', () => {
    expect(hv.word('猫见')).toBe('');
  });
});
