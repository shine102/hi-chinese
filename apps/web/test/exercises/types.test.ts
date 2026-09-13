import { describe, expect, it } from 'vitest';
import { checkAnswer, correctAnswerText, type Exercise } from '../../src/exercises/types.js';

const mc: Exercise = {
  kind: 'multiple-choice',
  id: 'mc:1',
  wordId: 'w:我',
  direction: 'zh-en',
  prompt: '我',
  promptSub: 'wǒ',
  speech: '我',
  options: ['you', 'I', 'he', 'good'],
  correctIndex: 1,
};
const builder: Exercise = {
  kind: 'sentence-builder',
  id: 'sb:1',
  sentenceId: 's:l1:002',
  vi: 'I am not him.',
  speech: '我不是他。',
  answer: ['我', '不', '是', '他'],
  tiles: ['他', '我', '好', '不', '是', '你'],
};
const pairs: Exercise = {
  kind: 'match-pairs',
  id: 'mp:1',
  pairs: [
    { wordId: 'w:我', zh: '我', vi: 'I' },
    { wordId: 'w:你', zh: '你', vi: 'you' },
  ],
};

describe('checkAnswer', () => {
  it('grades choices by index', () => {
    expect(checkAnswer(mc, { kind: 'choice', index: 1 })).toBe(true);
    expect(checkAnswer(mc, { kind: 'choice', index: 0 })).toBe(false);
    expect(checkAnswer(mc, { kind: 'order', tiles: [] })).toBe(false);
  });
  it('grades tile order exactly', () => {
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '不', '是', '他'] })).toBe(true);
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '是', '不', '他'] })).toBe(false);
    expect(checkAnswer(builder, { kind: 'order', tiles: ['我', '不', '是'] })).toBe(false);
  });
  it('accepts pairs only without mismatches', () => {
    expect(checkAnswer(pairs, { kind: 'pairs', mismatches: 0 })).toBe(true);
    expect(checkAnswer(pairs, { kind: 'pairs', mismatches: 1 })).toBe(false);
  });
});

describe('correctAnswerText', () => {
  it('renders the expected answer for feedback', () => {
    expect(correctAnswerText(mc)).toBe('I');
    expect(correctAnswerText(builder)).toBe('我不是他');
    expect(correctAnswerText(pairs)).toBe('我 = I, 你 = you');
  });
});
