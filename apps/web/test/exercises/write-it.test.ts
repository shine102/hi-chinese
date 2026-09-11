import { describe, expect, it } from 'vitest';
import { generateSession, type SessionInput } from '../../src/exercises/generate.js';
import { checkAnswer, correctAnswerText, type Answer, type Exercise } from '../../src/exercises/types.js';
import { fixtureUnit1, fixtureWords } from '../fixtures/content.js';

describe('write-it exercise', () => {
  const exercise: Exercise = {
    kind: 'write-it',
    id: 'write-4e00',
    character: '一',
    showOutline: true,
  };

  it('checkAnswer returns true for a completed write', () => {
    const answer: Answer = { kind: 'write', totalMistakes: 5, showedAnswer: false };
    expect(checkAnswer(exercise, answer)).toBe(true);
  });

  it('checkAnswer returns false when answer was shown', () => {
    const answer: Answer = { kind: 'write', totalMistakes: 0, showedAnswer: true };
    expect(checkAnswer(exercise, answer)).toBe(false);
  });

  it('checkAnswer returns false for wrong answer kind', () => {
    const answer: Answer = { kind: 'choice', index: 0 };
    expect(checkAnswer(exercise, answer)).toBe(false);
  });

  it('correctAnswerText returns the character', () => {
    expect(correctAnswerText(exercise)).toBe('一');
  });
});

describe('write-it in generateSession', () => {
  const words = new Map(fixtureWords.map((w) => [w.id, w]));
  const input: SessionInput = {
    chunk: fixtureUnit1,
    words,
    levelWordIds: fixtureWords.map((w) => w.id),
    audio: false,
  };

  it('generates at least one write-it exercise', () => {
    const exercises = generateSession(input, 42);
    const writeIts = exercises.filter((e) => e.kind === 'write-it');
    expect(writeIts.length).toBeGreaterThanOrEqual(1);
    expect(writeIts.length).toBeLessThanOrEqual(2);
  });

  it('write-it exercises have valid characters from the unit', () => {
    const exercises = generateSession(input, 42);
    const unitChars = new Set<string>();
    for (const wid of fixtureUnit1.unit.wordIds) {
      const w = words.get(wid);
      if (w) for (const ch of w.characters) unitChars.add(ch);
    }
    for (const ex of exercises) {
      if (ex.kind === 'write-it') {
        expect(unitChars.has(ex.character)).toBe(true);
        expect(ex.showOutline).toBe(true);
      }
    }
  });
});
