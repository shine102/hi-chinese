import { describe, expect, it } from 'vitest';
import { findEnglishFallbacks } from '../src/pipeline/vietnamese-coverage.js';
import type { CharacterData, ContentBundle, Word } from '../src/types.js';

const word = (simplified: string): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: '',
  pinyinNumeric: '',
  hanViet: 'X',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level: 1,
  frequency: 1,
  characters: [simplified],
  unitId: 'l1-u01',
});

const character = (ch: string): CharacterData => ({
  character: ch,
  strokes: [],
  medians: [],
  pinyin: [],
  hanViet: 'X',
  definition: 'x',
  radical: '',
  decomposition: '',
  wordIds: [],
  gloss: '',
  associations: [],
});

describe('findEnglishFallbacks', () => {
  it('lists only the words/characters absent from the Vietnamese maps', () => {
    const bundle: ContentBundle = {
      words: [word('你'), word('好')],
      characters: [character('你'), character('好')],
      units: [],
      grammar: [],
      sentences: [],
    };
    const report = findEnglishFallbacks(bundle, { 你: ['bạn'] }, { 你: 'bạn' });
    expect(report).toEqual({
      wordsOnEnglishFallback: ['好'],
      charactersOnEnglishFallback: ['好'],
    });
  });
});
