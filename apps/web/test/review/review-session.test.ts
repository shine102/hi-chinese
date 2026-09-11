import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  createReviewSession,
  currentReviewCard,
  reviewReducer,
  suggestWriteGrade,
  type ReviewState,
} from '../../src/review/review-session.js';

const mcExercise = {
  kind: 'multiple-choice' as const,
  id: 'test-mc',
  wordId: 'w:我',
  direction: 'zh-en' as const,
  prompt: '我',
  promptSub: 'wǒ',
  speech: '我',
  options: ['I; me', 'you', 'he', 'she'],
  correctIndex: 0,
};

const writeExercise = {
  kind: 'write-it' as const,
  id: 'test-wr',
  character: '我',
  showOutline: false,
};

describe('suggestWriteGrade', () => {
  it('0 mistakes → Easy', () => expect(suggestWriteGrade(0, false)).toBe(Rating.Easy));
  it('1 mistake → Good', () => expect(suggestWriteGrade(1, false)).toBe(Rating.Good));
  it('2 mistakes → Good', () => expect(suggestWriteGrade(2, false)).toBe(Rating.Good));
  it('3 mistakes → Hard', () => expect(suggestWriteGrade(3, false)).toBe(Rating.Hard));
  it('showed answer → Again', () => expect(suggestWriteGrade(0, true)).toBe(Rating.Again));
});

describe('reviewReducer', () => {
  it('creates a session with the given exercises', () => {
    const state = createReviewSession([mcExercise, writeExercise]);
    expect(state.exercises).toHaveLength(2);
    expect(state.phase).toBe('question');
    expect(state.position).toBe(0);
  });

  it('MC answer → auto-grade Good, phase feedback', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Good);
    expect(state.correct).toBe(1);
  });

  it('MC wrong answer → auto-grade Again, phase feedback', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 1 } });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Again);
    expect(state.correct).toBe(0);
  });

  it('write answer → phase grading with suggested grade', () => {
    let state = createReviewSession([writeExercise]);
    state = reviewReducer(state, {
      type: 'answer',
      answer: { kind: 'write', totalMistakes: 1, showedAnswer: false },
    });
    expect(state.phase).toBe('grading');
    expect(state.suggestedGrade).toBe(Rating.Good);
    expect(state.confirmedGrade).toBe(Rating.Good); // defaults to suggested
  });

  it('grade action overrides the suggested grade', () => {
    let state = createReviewSession([writeExercise]);
    state = reviewReducer(state, {
      type: 'answer',
      answer: { kind: 'write', totalMistakes: 1, showedAnswer: false },
    });
    state = reviewReducer(state, { type: 'grade', rating: Rating.Hard });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Hard);
  });

  it('next advances position', () => {
    let state = createReviewSession([mcExercise, writeExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    state = reviewReducer(state, { type: 'next' });
    expect(state.position).toBe(1);
    expect(state.phase).toBe('question');
  });

  it('next after last card → done', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    state = reviewReducer(state, { type: 'next' });
    expect(state.phase).toBe('done');
    expect(state.grades).toHaveLength(1);
  });

  it('skip removes current exercise', () => {
    let state = createReviewSession([mcExercise, writeExercise]);
    state = reviewReducer(state, { type: 'skip' });
    expect(state.exercises).toHaveLength(1);
    expect(state.skipped).toBe(1);
  });
});
