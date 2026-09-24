import { describe, expect, it } from 'vitest';
import { checkSentencePinyin, type ReadingWord } from '../src/pipeline/sentence-pinyin.js';

// prettier-ignore
const dict: [string, string, string[]?][] = [
  ['我', 'wo3'], ['不', 'bu4'], ['是', 'shi4'], ['你', 'ni3'], ['一', 'yi1'], ['个', 'ge4'],
  ['这', 'zhe4'], ['星期', 'xing1 qi1'], ['起来', 'qi3 lai5'], ['只', 'zhi3', ['zhi1']],
  ['狗', 'gou3'], ['在家', 'zai4 jia1'], ['去', 'qu4'], ['过', 'guo4', ['guo5']],
  ['孩子', 'hai2 zi5'], ['们', 'men5'], ['站', 'zhan4'], ['统一', 'tong3 yi1'], ['了', 'le5', ['liao3']], ['吃', 'chi1'], ['都', 'dou1', ['Du1']],
];
const by = new Map<string, ReadingWord>(
  dict.map(([simplified, pinyinNumeric, alt]) => [
    simplified,
    { simplified, pinyinNumeric, alternates: (alt ?? []).map((p) => ({ pinyinNumeric: p })) },
  ]),
);
const check = (pinyin: string, words: string[]) =>
  checkSentencePinyin({ id: 's', pinyin, words }, by).map(
    (i) => `${i.kind} ${i.token} ${i.expected}/${i.got}`,
  );

describe('checkSentencePinyin', () => {
  it('accepts correct pinyin with 不 sandhi', () => {
    expect(check('Wǒ bú shì nǐ.', ['我', '不', '是', '你'])).toEqual([]);
  });
  it('requires 不 sandhi before tone 4', () => {
    expect(check('Wǒ bù shì nǐ.', ['我', '不', '是', '你'])).toEqual(['tone 不 2/4']);
  });
  it('does not apply 不 sandhi across a clause break', () => {
    expect(check('Wǒ bù, shì nǐ.', ['我', '不', '是', '你'])).toEqual([]);
    expect(check('Wǒ bú, shì nǐ.', ['我', '不', '是', '你'])).toEqual(['tone 不 4/2']);
  });
  it('allows neutral 不 in A-不-A', () => {
    expect(check('Nǐ shì bu shì?', ['你', '是', '不', '是'])).toEqual([]);
  });
  it('requires 一 sandhi before a measure word', () => {
    expect(check('yí ge', ['一', '个'])).toEqual([]);
    expect(check('yī gè', ['一', '个'])).toEqual(['tone 一 2/1']);
  });
  it('keeps 一 tone 1 when counting', () => {
    expect(check('xīngqī yī', ['星期', '一'])).toEqual([]);
  });
  it('leaves 一 at the end of a word', () => {
    expect(check('tǒngyī', ['统一'])).toEqual([]);
  });
  it('joins 这个 and writes 个 neutral', () => {
    expect(check('zhège', ['这', '个'])).toEqual([]);
  });
  it('follows the dictionary neutral tone', () => {
    expect(check('zhàn qǐlai', ['站', '起来'])).toEqual([]);
    expect(check('zhàn qǐlái', ['站', '起来'])).toEqual(['tone 起来 5/2']);
  });
  it('accepts an alternate reading', () => {
    expect(check('yì zhī gǒu', ['一', '只', '狗'])).toEqual([]);
  });
  it('flags a split two-syllable token and a joined particle', () => {
    expect(check('zài jiā', ['在家'])).toEqual(['split 在家 one word/split']);
    expect(check('zàijiā', ['在家'])).toEqual([]);
    expect(check('qùguo', ['去', '过'])).toEqual(['join 去过 separate/joined']);
    expect(check('qù guo', ['去', '过'])).toEqual([]);
  });
  it('lets 们 join its noun', () => {
    expect(check('háizimen', ['孩子', '们'])).toEqual([]);
  });
  it('reports syllable mismatches and unknown tokens', () => {
    expect(check('nǐ', ['我'])).toEqual(['syllables 我 token readings/ni']);
    expect(check('wǒ', ['他'])).toEqual(['unknown-token 他 course word/他']);
  });
  it('does not let a verb reading of 了 go neutral', () => {
    expect(check('chī bu liǎo', ['吃', '不', '了'])).toEqual([]);
    expect(check('chī bu liao', ['吃', '不', '了'])).not.toEqual([]);
  });
  it('ignores capitalised (surname) readings', () => {
    expect(check('dōu', ['都'])).toEqual([]);
    expect(check('dū', ['都'])).not.toEqual([]);
  });
});
