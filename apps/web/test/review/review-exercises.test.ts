import { cardId, type CardRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { emptyFsrsState } from '../../src/fsrs/state.js';
import { cardToExercise, generateReviewSession } from '../../src/review/review-exercises.js';
import { fixtureWords } from '../fixtures/content.js';

const now = Date.now();
const words = new Map(fixtureWords.map((w) => [w.id, w]));
const allWordIds = fixtureWords.map((w) => w.id);

function card(kind: 'word-recognition' | 'word-recall' | 'char-write', itemId: string): CardRow {
  return {
    cardId: cardId(kind, itemId),
    kind,
    fsrs: emptyFsrsState(now),
    updatedAt: now,
  };
}

describe('cardToExercise', () => {
  it('word-recognition → MC zh-en', () => {
    const ex = cardToExercise(card('word-recognition', 'w:我'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('multiple-choice');
    if (ex!.kind === 'multiple-choice') {
      expect(ex!.direction).toBe('zh-en');
      expect(ex!.prompt).toBe('我');
    }
  });

  it('word-recall → MC en-zh', () => {
    const ex = cardToExercise(card('word-recall', 'w:你'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('multiple-choice');
    if (ex!.kind === 'multiple-choice') {
      expect(ex!.direction).toBe('en-zh');
    }
  });

  it('char-write → write-it with showOutline false', () => {
    const ex = cardToExercise(card('char-write', '我'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('write-it');
    if (ex!.kind === 'write-it') {
      expect(ex!.character).toBe('我');
      expect(ex!.showOutline).toBe(false);
    }
  });

  it('returns null for unknown word', () => {
    const ex = cardToExercise(card('word-recognition', 'w:unknown'), words, allWordIds, () => 0.5);
    expect(ex).toBeNull();
  });
});

describe('generateReviewSession', () => {
  it('shuffles cards and produces exercises', () => {
    const cards = [
      card('word-recognition', 'w:我'),
      card('word-recall', 'w:你'),
      card('char-write', '好'),
    ];
    const exercises = generateReviewSession(cards, words, allWordIds, 42);
    expect(exercises).toHaveLength(3);
  });
});
