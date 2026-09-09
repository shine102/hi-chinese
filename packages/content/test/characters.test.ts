import { describe, expect, it } from 'vitest';
import { buildCharacters, parseJsonLines } from '../src/pipeline/characters.js';
import type { Word } from '../src/types.js';

const dictionary = [
  '{"character":"你","definition":"you, second person pronoun","pinyin":["nǐ"],"decomposition":"⿰亻尔","radical":"亻","matches":[[0]]}',
  '{"character":"好","definition":"good, excellent, fine; proper, suitable; well","pinyin":["hǎo"],"decomposition":"⿰女子","radical":"女","matches":[[0]]}',
  '{"character":"⺀","pinyin":[],"decomposition":"？","radical":"⺀","matches":[null,null]}',
  '',
].join('\n');

const graphics = [
  '{"character":"你","strokes":["M 1 1 L 2 2","M 3 3 L 4 4"],"medians":[[[1,1],[2,2]],[[3,3],[4,4]]]}',
  '{"character":"⺀","strokes":["M 0 0"],"medians":[[[0,0]]]}',
].join('\n');

const word = (simplified: string, characters: string[]): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: '',
  pinyinNumeric: '',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level: 1,
  frequency: 1,
  characters,
  unitId: 'l1-u01',
});

describe('parseJsonLines', () => {
  it('parses one JSON object per non-empty line', () => {
    expect(parseJsonLines<{ character: string }>(dictionary).map((e) => e.character)).toEqual(['你', '好', '⺀']);
  });
});

describe('buildCharacters', () => {
  it('returns data only for characters used by words, with word back-references', () => {
    const { characters, missing } = buildCharacters(dictionary, graphics, [
      word('你', ['你']),
      word('你好', ['你', '好']),
    ]);
    expect(missing).toEqual(['好']);
    expect(characters).toHaveLength(1);
    expect(characters[0]).toEqual({
      character: '你',
      strokes: ['M 1 1 L 2 2', 'M 3 3 L 4 4'],
      medians: [[[1, 1], [2, 2]], [[3, 3], [4, 4]]],
      pinyin: ['nǐ'],
      definition: 'you, second person pronoun',
      radical: '亻',
      decomposition: '⿰亻尔',
      wordIds: ['w:你', 'w:你好'],
    });
  });

  it('uses null definition and empty fields when the dictionary lacks the character', () => {
    const { characters } = buildCharacters('', graphics, [word('你', ['你'])]);
    expect(characters[0]).toMatchObject({ character: '你', definition: null, pinyin: [], radical: '', decomposition: '' });
  });
});
