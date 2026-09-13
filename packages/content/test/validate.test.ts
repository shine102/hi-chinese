import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/pipeline/validate.js';
import type {
  CharacterData,
  ContentBundle,
  GrammarPoint,
  Sentence,
  Unit,
  Word,
} from '../src/types.js';

const word = (s: string, unitId: string, over: Partial<Word> = {}): Word => ({
  id: `w:${s}`,
  simplified: s,
  traditional: s,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  hanViet: 'X',
  meanings: ['m'],
  alternates: [],
  pos: [],
  classifiers: [],
  level: 1,
  frequency: 1,
  characters: [...s],
  unitId,
  ...over,
});
const char = (c: string, over: Partial<CharacterData> = {}): CharacterData => ({
  character: c,
  strokes: ['M 0 0'],
  medians: [[[0, 0]]],
  pinyin: [],
  hanViet: 'X',
  definition: null,
  radical: '',
  decomposition: '',
  wordIds: [],
  ...over,
});

function bundle(): ContentBundle {
  const units: Unit[] = [
    {
      id: 'l1-u01',
      level: 1,
      order: 1,
      title: 'Unit 1',
      wordIds: ['w:我', 'w:是'],
      grammarIds: ['g1'],
      sentenceIds: ['s1'],
    },
    {
      id: 'l1-u02',
      level: 1,
      order: 2,
      title: 'Unit 2',
      wordIds: ['w:你'],
      grammarIds: [],
      sentenceIds: ['s2'],
    },
  ];
  const words = [word('我', 'l1-u01'), word('是', 'l1-u01'), word('你', 'l1-u02')];
  const characters = [char('我'), char('是'), char('你')];
  const sentences: Sentence[] = [
    { id: 's1', zh: '我是。', pinyin: 'x', vi: 'x', wordIds: ['w:我', 'w:是'], unitId: 'l1-u01' },
    {
      id: 's2',
      zh: '你是我。',
      pinyin: 'x',
      vi: 'x',
      wordIds: ['w:你', 'w:是', 'w:我'],
      unitId: 'l1-u02',
    },
  ];
  const grammar: GrammarPoint[] = [
    {
      id: 'g1',
      title: 't',
      pattern: 'p',
      explanation: 'e',
      level: 1,
      sentenceIds: ['s1'],
      unitId: 'l1-u01',
    },
  ];
  return { words, characters, units, grammar, sentences };
}

const rules = (b: ContentBundle) => validateContent(b).map((e) => e.rule);

describe('validateContent', () => {
  it('accepts a consistent bundle', () => {
    expect(validateContent(bundle())).toEqual([]);
  });
  it('rejects duplicate ids', () => {
    const b = bundle();
    b.words.push(word('我', 'l1-u01'));
    expect(rules(b)).toContain('unique-id');
  });
  it('rejects words without meanings or pinyin', () => {
    const b = bundle();
    b.words[0] = word('我', 'l1-u01', { meanings: [] });
    b.words[1] = word('是', 'l1-u01', { pinyin: '' });
    expect(rules(b)).toEqual(expect.arrayContaining(['word-meaning', 'word-pinyin']));
  });
  it('rejects a word without hanViet', () => {
    const b = bundle();
    b.words[0] = word('我', 'l1-u01', { hanViet: '' });
    expect(rules(b)).toContain('word-hanviet');
  });
  it('rejects a character without hanViet', () => {
    const b = bundle();
    b.characters[0] = char('我', { hanViet: '' });
    expect(rules(b)).toContain('char-hanviet');
  });
  it('rejects a sentence without a Vietnamese translation', () => {
    const b = bundle();
    b.sentences[0] = { ...b.sentences[0]!, vi: '' };
    expect(rules(b)).toContain('sentence-vi');
  });
  it('accepts a sentence with a non-empty Vietnamese translation', () => {
    const b = bundle();
    b.sentences[0] = { ...b.sentences[0]!, vi: 'Tôi là.' };
    expect(rules(b)).not.toContain('sentence-vi');
  });
  it('rejects word/unit mismatches and empty units', () => {
    const b = bundle();
    b.words[2] = word('你', 'l1-u01');
    b.units[1]!.wordIds = [];
    expect(rules(b)).toEqual(expect.arrayContaining(['word-unit', 'unit-empty']));
  });
  it('rejects missing or malformed character data', () => {
    const b = bundle();
    b.characters = [char('我'), char('是', { medians: [] })];
    const errs = validateContent(b);
    expect(errs.map((e) => [e.rule, e.ref])).toEqual(
      expect.arrayContaining([
        ['char-missing', '你'],
        ['char-strokes', '是'],
      ]),
    );
  });
  it('rejects sentences using words from later units or unknown words', () => {
    const b = bundle();
    b.sentences[0] = { ...b.sentences[0]!, wordIds: ['w:你', 'w:是'] };
    b.sentences[1] = { ...b.sentences[1]!, wordIds: ['w:鸟'] };
    const errs = validateContent(b).filter((e) => e.rule === 'sentence-order');
    expect(errs.map((e) => e.ref)).toEqual(['s1', 's2']);
  });
  it('rejects grammar points with bad references, wrong level, or no examples', () => {
    const b = bundle();
    b.grammar[0] = { ...b.grammar[0]!, sentenceIds: [], level: 2 };
    expect(rules(b)).toContain('grammar-refs');
  });
  it('rejects units referencing ids that do not point back', () => {
    const b = bundle();
    b.units[1]!.grammarIds = ['g1'];
    b.units[0]!.sentenceIds = ['s9'];
    expect(validateContent(b).filter((e) => e.rule === 'unit-refs')).toHaveLength(2);
  });
});
