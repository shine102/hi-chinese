import { describe, expect, it } from 'vitest';
import { attachToUnits, placeAuthoredGrammar, placeGrammar, placeSentences } from '../src/pipeline/placement.js';
import type {
  AuthoredGrammar,
  AuthoredSentence,
  HskLevel,
  Sentence,
  Unit,
  Word,
} from '../src/types.js';

const unit = (id: string, level: 1 | 2, order: number, wordIds: string[]): Unit => ({
  id,
  level,
  order,
  title: id,
  wordIds,
  grammarIds: [],
  sentenceIds: [],
});
const word = (s: string, unitId: string, level: 1 | 2): Word => ({
  id: `w:${s}`,
  simplified: s,
  traditional: s,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  hanViet: 'X',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level,
  frequency: 1,
  characters: [...s],
  unitId,
});

const units = [
  unit('l1-u01', 1, 1, ['w:我', 'w:是', 'w:你']),
  unit('l1-u02', 1, 2, ['w:学生', 'w:不']),
  unit('l2-u01', 2, 3, ['w:老师']),
];
const words = [
  word('我', 'l1-u01', 1),
  word('是', 'l1-u01', 1),
  word('你', 'l1-u01', 1),
  word('学生', 'l1-u02', 1),
  word('不', 'l1-u02', 1),
  word('老师', 'l2-u01', 2),
];

const s1: AuthoredSentence = {
  id: 's1',
  zh: '我是你。',
  pinyin: 'Wǒ shì nǐ.',
  vi: 'I am you.',
  words: ['我', '是', '你'],
};
const s2: AuthoredSentence = {
  id: 's2',
  zh: '我不是学生。',
  pinyin: 'Wǒ bú shì xuéshēng.',
  vi: 'I am not a student.',
  words: ['我', '不', '是', '学生'],
};
const s3: AuthoredSentence = {
  id: 's3',
  zh: '你是老师。',
  pinyin: 'Nǐ shì lǎoshī.',
  vi: 'You are a teacher.',
  words: ['你', '是', '老师'],
};

describe('placeSentences', () => {
  it('places each sentence in the latest unit among its words', () => {
    const { sentences, errors } = placeSentences([s1, s2, s3], words, units);
    expect(errors).toEqual([]);
    expect(sentences.map((s) => [s.id, s.unitId])).toEqual([
      ['s1', 'l1-u01'],
      ['s2', 'l1-u02'],
      ['s3', 'l2-u01'],
    ]);
    expect(sentences[1]).toEqual({
      id: 's2',
      zh: '我不是学生。',
      pinyin: 'Wǒ bú shì xuéshēng.',
      vi: 'I am not a student.',
      wordIds: ['w:我', 'w:不', 'w:是', 'w:学生'],
      unitId: 'l1-u02',
    });
  });
  it('reports unknown tokens, token mismatches and duplicate ids, skipping those sentences', () => {
    const bad1: AuthoredSentence = { ...s1, id: 'b1', words: ['我', '是', '猫'], zh: '我是猫。' };
    const bad2: AuthoredSentence = { ...s1, id: 'b2', zh: '我是你们。' };
    const { sentences, errors } = placeSentences([s1, bad1, bad2, { ...s1 }], words, units);
    expect(sentences.map((s) => s.id)).toEqual(['s1']);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([
      ['unknown-token', 'b1'],
      ['token-mismatch', 'b2'],
      ['duplicate-id', 's1'],
    ]);
    expect(errors[0]!.message).toContain('猫');
  });
});

const placed = (): Sentence[] => placeSentences([s1, s2, s3], words, units).sentences;

describe('placeGrammar', () => {
  const g = (id: string, level: HskLevel, examples: string[]): AuthoredGrammar => ({
    id,
    title: id,
    pattern: 'A 是 B',
    explanation: 'x',
    level,
    examples,
  });

  it('places a grammar point in the latest unit among its examples', () => {
    const { grammar, errors } = placeGrammar([g('g1', 1, ['s1', 's2'])], placed(), units);
    expect(errors).toEqual([]);
    expect(grammar[0]).toEqual({
      id: 'g1',
      title: 'g1',
      pattern: 'A 是 B',
      explanation: 'x',
      level: 1,
      sentenceIds: ['s1', 's2'],
      unitId: 'l1-u02',
    });
  });
  it('moves a point forward to the first unit of its declared level', () => {
    const { grammar } = placeGrammar([g('g1', 2, ['s1'])], placed(), units);
    expect(grammar[0]!.unitId).toBe('l2-u01');
  });
  it('errors when examples need a later level than declared', () => {
    const { grammar, errors } = placeGrammar([g('g1', 1, ['s3'])], placed(), units);
    expect(grammar).toEqual([]);
    expect(errors.map((e) => e.kind)).toEqual(['level-mismatch']);
  });
  it('errors on missing example sentences', () => {
    const { errors } = placeGrammar([g('g1', 1, ['nope'])], placed(), units);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['missing-sentence', 'g1']]);
  });
  it('errors when a declared level has no units, even with a valid lower-level example', () => {
    const soloUnits = [unit('l1-u01', 1, 1, ['w:我', 'w:是'])];
    const soloWords = [word('我', 'l1-u01', 1), word('是', 'l1-u01', 1)];
    const { sentences } = placeSentences(
      [{ id: 's1', zh: '我是。', pinyin: 'Wǒ shì.', vi: 'I am.', words: ['我', '是'] }],
      soloWords,
      soloUnits,
    );
    const { grammar, errors } = placeGrammar([g('g1', 3, ['s1'])], sentences, soloUnits);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['level-mismatch', 'g1']]);
    expect(grammar).toEqual([]);
  });
  it('spills extra points through same-level units only, erroring once the level runs out', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => g(id, 1, ['s1']));
    const { grammar, errors } = placeGrammar(many, placed(), units, 2);
    expect(grammar.map((x) => [x.id, x.unitId])).toEqual([
      ['a', 'l1-u01'],
      ['b', 'l1-u01'],
      ['c', 'l1-u02'],
      ['d', 'l1-u02'],
    ]);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([
      ['overflow', 'e'],
      ['overflow', 'f'],
      ['overflow', 'g'],
    ]);
  });
});

describe('placeAuthoredGrammar', () => {
  const g = (id: string, level: HskLevel, examples: string[]): AuthoredGrammar => ({
    id,
    title: id,
    pattern: 'A 是 B',
    explanation: 'x',
    level,
    examples,
  });

  it('places a grammar point in the EARLIEST unit among its examples', () => {
    const { grammar, errors } = placeAuthoredGrammar([g('g1', 1, ['s2', 's1'])], placed(), units);
    expect(errors).toEqual([]);
    expect(grammar[0]!.unitId).toBe('l1-u01'); // s1 (order 1) beats s2 (order 2)
    expect(grammar[0]!.sentenceIds).toEqual(['s2', 's1']);
  });

  it('allows more than two grammar points in one unit (no cap)', () => {
    const { grammar, errors } = placeAuthoredGrammar(
      [g('g1', 1, ['s1']), g('g2', 1, ['s1']), g('g3', 1, ['s1'])],
      placed(),
      units,
    );
    expect(errors).toEqual([]);
    expect(grammar.map((x) => x.unitId)).toEqual(['l1-u01', 'l1-u01', 'l1-u01']);
  });

  it('errors on missing example sentences', () => {
    const { grammar, errors } = placeAuthoredGrammar([g('g1', 1, ['nope'])], placed(), units);
    expect(grammar).toEqual([]);
    expect(errors.map((e) => e.kind)).toEqual(['missing-sentence']);
  });
});

describe('attachToUnits', () => {
  it('fills sentenceIds and grammarIds on unit copies', () => {
    const sentences = placed();
    const { grammar } = placeGrammar(
      [{ id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 1, examples: ['s2'] }],
      sentences,
      units,
    );
    const out = attachToUnits(units, sentences, grammar);
    expect(out[0]!.sentenceIds).toEqual(['s1']);
    expect(out[1]!.sentenceIds).toEqual(['s2']);
    expect(out[1]!.grammarIds).toEqual(['g1']);
    expect(out[2]!.sentenceIds).toEqual(['s3']);
    expect(units[1]!.grammarIds).toEqual([]);
  });
});
