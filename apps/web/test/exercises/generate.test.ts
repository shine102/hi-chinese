import { describe, expect, it } from 'vitest';
import {
  generateSession,
  primaryMeaning,
  SESSION_SIZE,
  tokensOf,
  type SessionInput,
} from '../../src/exercises/generate.js';
import type { Exercise } from '../../src/exercises/types.js';
import { fixtureUnit1, fixtureWords } from '../fixtures/content.js';

const words = new Map(fixtureWords.map((w) => [w.id, w] as const));
const input: SessionInput = {
  chunk: fixtureUnit1,
  words,
  levelWordIds: fixtureWords.map((w) => w.id),
  audio: false,
};

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

describe('generateSession', () => {
  const session = generateSession(input, 123);

  it('is deterministic for a seed and has SESSION_SIZE exercises with unique ids', () => {
    expect(generateSession(input, 123)).toEqual(session);
    expect(generateSession(input, 124)).not.toEqual(session);
    expect(session).toHaveLength(SESSION_SIZE);
    expect(new Set(session.map((e) => e.id)).size).toBe(SESSION_SIZE);
  });

  it('starts with a multiple-choice exercise and mixes every kind except listen-pick without audio', () => {
    expect(session[0]?.kind).toBe('multiple-choice');
    expect(byKind(session, 'fill-blank')).toHaveLength(1);
    expect(byKind(session, 'sentence-builder')).toHaveLength(2);
    expect(byKind(session, 'match-pairs')).toHaveLength(1);
    expect(byKind(session, 'listen-pick')).toHaveLength(0);
    expect(byKind(session, 'multiple-choice')).toHaveLength(11);
  });

  it('adds three listen-pick exercises when audio is available', () => {
    const withAudio = generateSession({ ...input, audio: true }, 5);
    expect(withAudio).toHaveLength(SESSION_SIZE);
    expect(byKind(withAudio, 'listen-pick')).toHaveLength(3);
    for (const e of byKind(withAudio, 'listen-pick')) {
      if (e.kind !== 'listen-pick') continue;
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

  it('pairs five unit words with distinct meanings', () => {
    const [pairs] = byKind(session, 'match-pairs');
    if (pairs?.kind !== 'match-pairs') throw new Error('expected match-pairs');
    expect(pairs.pairs).toHaveLength(5);
    expect(new Set(pairs.pairs.map((p) => p.en)).size).toBe(5);
    for (const p of pairs.pairs) expect(fixtureUnit1.unit.wordIds).toContain(p.wordId);
  });

  it('uses only multiple choice when the unit has no sentences and too few words for pairs', () => {
    const tiny: SessionInput = {
      ...input,
      chunk: {
        unit: { ...fixtureUnit1.unit, wordIds: ['w:我', 'w:你'], grammarIds: [], sentenceIds: [] },
        grammar: [],
        sentences: [],
      },
    };
    const s = generateSession(tiny, 1);
    expect(s.every((e) => e.kind === 'multiple-choice')).toBe(true);
    expect(s).toHaveLength(6); // 2 words x 3 directions
  });
});
