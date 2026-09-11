import { describe, expect, it } from 'vitest';
import {
  generateSession,
  primaryMeaning,
  sessionSize,
  tokensOf,
  type SessionInput,
} from '../../src/exercises/generate.js';
import type { Exercise } from '../../src/exercises/types.js';
import { fixtureUnit1, fixtureWords } from '../fixtures/content.js';

const words = new Map(fixtureWords.map((w) => [w.id, w] as const));

const newWords = fixtureUnit1.unit.wordIds.slice(0, 4).flatMap((id) => {
  const w = words.get(id);
  return w ? [w] : [];
});
const reviewWords = fixtureUnit1.unit.wordIds.slice(4).flatMap((id) => {
  const w = words.get(id);
  return w ? [w] : [];
});
const newWordIds = new Set(newWords.map((w) => w.id));
const reviewWordIds = new Set(reviewWords.map((w) => w.id));

const input: SessionInput = {
  newWords,
  reviewWords,
  grammar: fixtureUnit1.grammar,
  sentences: fixtureUnit1.sentences,
  words,
  levelWordIds: fixtureWords.map((w) => w.id),
  audio: false,
};

const SIZE = sessionSize(newWords.length, reviewWords.length);

const byKind = (session: Exercise[], kind: Exercise['kind']) =>
  session.filter((e) => e.kind === kind);

describe('helpers', () => {
  it('primaryMeaning takes the text before the first semicolon', () => {
    expect(primaryMeaning(words.get('w:我')!)).toBe('I');
    expect(primaryMeaning(words.get('w:老师')!)).toBe('teacher');
  });
  it('tokensOf maps word ids to simplified forms', () => {
    expect(tokensOf(fixtureUnit1.sentences[1]!, words)).toEqual(['我', '不', '是', '他']);
  });
});

describe('sessionSize', () => {
  it('grows with new words and review words, capped at 15', () => {
    expect(sessionSize(4, 0)).toBe(10);
    expect(sessionSize(4, 4)).toBe(13);
    expect(sessionSize(4, 100)).toBe(13);
    expect(sessionSize(20, 20)).toBe(15);
  });
});

describe('generateSession', () => {
  const session = generateSession(input, 123);

  it('is deterministic for a seed and has the computed session size with unique ids', () => {
    expect(generateSession(input, 123)).toEqual(session);
    expect(generateSession(input, 124)).not.toEqual(session);
    expect(session).toHaveLength(SIZE);
    expect(new Set(session.map((e) => e.id)).size).toBe(SIZE);
  });

  it('starts with a multiple-choice exercise and mixes every kind except listen-pick without audio', () => {
    expect(session[0]?.kind).toBe('multiple-choice');
    expect(byKind(session, 'fill-blank')).toHaveLength(1);
    expect(byKind(session, 'sentence-builder')).toHaveLength(2);
    expect(byKind(session, 'match-pairs')).toHaveLength(1);
    expect(byKind(session, 'listen-pick')).toHaveLength(0);
    const writeIts = byKind(session, 'write-it');
    expect(writeIts.length).toBeGreaterThanOrEqual(1);
    expect(writeIts.length).toBeLessThanOrEqual(2);
    expect(byKind(session, 'multiple-choice')).toHaveLength(SIZE - 4 - writeIts.length);
  });

  it('gives every new word at least one exercise and adds review exercises when review words exist', () => {
    const mc = byKind(session, 'multiple-choice').flatMap((e) =>
      e.kind === 'multiple-choice' ? [e.wordId] : [],
    );
    for (const w of newWords) expect(mc).toContain(w.id);

    const reviewMcCount = mc.filter((wordId) => reviewWordIds.has(wordId)).length;
    expect(reviewMcCount).toBeGreaterThanOrEqual(2);
    expect(reviewMcCount).toBeLessThanOrEqual(3);
  });

  it('adds three listen-pick exercises when audio is available', () => {
    const withAudio = generateSession({ ...input, audio: true }, 5);
    expect(withAudio).toHaveLength(SIZE);
    expect(byKind(withAudio, 'listen-pick')).toHaveLength(3);
    for (const e of byKind(withAudio, 'listen-pick')) {
      if (e.kind !== 'listen-pick') continue;
      expect(newWordIds.has(e.wordId)).toBe(true);
      expect(e.options[e.correctIndex]).toBe(words.get(e.wordId)?.simplified);
      expect(new Set(e.options).size).toBe(4);
    }
  });

  it('builds four distinct options with the right answer in place for every choice exercise', () => {
    for (const e of session) {
      if (e.kind === 'multiple-choice') {
        const w = words.get(e.wordId)!;
        expect(e.options).toHaveLength(4);
        expect(new Set(e.options).size).toBe(4);
        const expected = e.direction === 'zh-en' ? primaryMeaning(w) : w.simplified;
        expect(e.options[e.correctIndex]).toBe(expected);
        if (e.direction === 'zh-en') {
          expect(e.prompt).toBe(w.simplified);
          expect(e.promptSub).toBe(w.pinyin);
          expect(e.speech).toBe(w.simplified);
        } else if (e.direction === 'en-zh') {
          expect(e.prompt).toBe(primaryMeaning(w));
          expect(e.speech).toBeNull();
        } else {
          expect(e.prompt).toBe(w.pinyin);
        }
      }
      if (e.kind === 'fill-blank') {
        expect(e.options).toHaveLength(4);
        expect(e.options[e.correctIndex]).toBe(e.tokens[e.blankIndex]);
        expect(e.grammarId).toBe('g:bu-negation');
      }
    }
  });

  it('gives sentence builders the sentence tokens plus two distractor tiles', () => {
    for (const e of byKind(session, 'sentence-builder')) {
      if (e.kind !== 'sentence-builder') continue;
      const sentence = fixtureUnit1.sentences.find((s) => s.id === e.sentenceId)!;
      expect(e.answer).toEqual(tokensOf(sentence, words));
      expect(e.tiles).toHaveLength(e.answer.length + 2);
      for (const t of e.answer) expect(e.tiles).toContain(t);
      expect(e.en).toBe(sentence.en);
      expect(e.speech).toBe(sentence.zh);
    }
  });

  it('pairs five words with distinct meanings, drawn from new and review words', () => {
    const [pairs] = byKind(session, 'match-pairs');
    if (pairs?.kind !== 'match-pairs') throw new Error('expected match-pairs');
    expect(pairs.pairs).toHaveLength(5);
    expect(new Set(pairs.pairs.map((p) => p.en)).size).toBe(5);
    for (const p of pairs.pairs)
      expect(newWordIds.has(p.wordId) || reviewWordIds.has(p.wordId)).toBe(true);
  });

  it('draws write-it characters from new words only', () => {
    const newWordChars = new Set(newWords.flatMap((w) => w.characters));
    for (const e of byKind(session, 'write-it')) {
      if (e.kind !== 'write-it') continue;
      expect(newWordChars.has(e.character)).toBe(true);
    }
  });

  it('adds no review exercises for a first sub-lesson with no review words', () => {
    const firstLesson: SessionInput = { ...input, reviewWords: [] };
    const firstSize = sessionSize(newWords.length, 0);
    const s = generateSession(firstLesson, 7);
    expect(s).toHaveLength(firstSize);
    for (const e of byKind(s, 'multiple-choice')) {
      if (e.kind !== 'multiple-choice') continue;
      expect(newWordIds.has(e.wordId)).toBe(true);
    }
  });

  it('uses only multiple choice and write-it when there are no sentences and too few words for pairs', () => {
    const tiny: SessionInput = {
      ...input,
      newWords: [words.get('w:我')!, words.get('w:你')!],
      reviewWords: [],
      grammar: [],
      sentences: [],
    };
    const s = generateSession(tiny, 1);
    expect(s.every((e) => e.kind === 'multiple-choice' || e.kind === 'write-it')).toBe(true);
    expect(byKind(s, 'multiple-choice')).toHaveLength(6); // 2 words x 3 directions
    expect(byKind(s, 'write-it').length).toBeGreaterThanOrEqual(1);
    expect(byKind(s, 'write-it').length).toBeLessThanOrEqual(2);
  });
});
