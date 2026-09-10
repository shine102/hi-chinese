import { describe, expect, it } from 'vitest';
import {
  accuracy,
  createSession,
  currentExercise,
  sessionProgress,
  sessionReducer,
  type SessionState,
} from '../../src/exercises/session.js';
import type { Exercise } from '../../src/exercises/types.js';

const mc = (id: string): Exercise => ({
  kind: 'multiple-choice',
  id,
  wordId: 'w:我',
  direction: 'en-zh',
  prompt: 'I',
  promptSub: null,
  speech: null,
  options: ['我', '你', '他', '好'],
  correctIndex: 0,
});

const right = { type: 'answer', answer: { kind: 'choice', index: 0 } } as const;
const wrong = { type: 'answer', answer: { kind: 'choice', index: 2 } } as const;
const next = { type: 'next' } as const;

function run(
  state: SessionState,
  ...actions: Parameters<typeof sessionReducer>[1][]
): SessionState {
  return actions.reduce(sessionReducer, state);
}

describe('session reducer', () => {
  it('starts on the first question, or done for an empty session', () => {
    const s = createSession([mc('a'), mc('b')]);
    expect(s.phase).toBe('question');
    expect(currentExercise(s)?.id).toBe('a');
    expect(sessionProgress(s)).toBe(0);
    expect(createSession([]).phase).toBe('done');
    expect(currentExercise(createSession([]))).toBeNull();
  });

  it('shows feedback after an answer and advances on next', () => {
    const s1 = run(createSession([mc('a'), mc('b')]), right);
    expect(s1.phase).toBe('feedback');
    expect(s1.lastCorrect).toBe(true);
    expect(s1.streak).toBe(1);
    expect(s1.correct).toBe(1);
    expect(s1.answered).toBe(1);
    const s2 = run(s1, next);
    expect(s2.phase).toBe('question');
    expect(currentExercise(s2)?.id).toBe('b');
    expect(sessionProgress(s2)).toBe(0.5);
  });

  it('re-queues a wrong answer at the end and resets the streak', () => {
    const s = run(createSession([mc('a'), mc('b')]), right, next, wrong);
    expect(s.lastCorrect).toBe(false);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(1);
    expect(s.queue.map((e) => e.id)).toEqual(['a', 'b', 'b']);
    const s2 = run(s, next);
    expect(s2.phase).toBe('question');
    expect(currentExercise(s2)?.id).toBe('b');
    const s3 = run(s2, right, next);
    expect(s3.phase).toBe('done');
    expect(accuracy(s3)).toBeCloseTo(2 / 3);
  });

  it('finishes after the last answer', () => {
    const s = run(createSession([mc('a')]), right, next);
    expect(s.phase).toBe('done');
    expect(sessionProgress(s)).toBe(1);
    expect(accuracy(s)).toBe(1);
  });

  it('ignores answers during feedback and next during a question', () => {
    const start = createSession([mc('a'), mc('b')]);
    expect(run(start, next)).toEqual(start);
    const fb = run(start, right);
    expect(run(fb, wrong)).toEqual(fb);
  });

  it('skip drops the current exercise without counting it', () => {
    const s = run(createSession([mc('a'), mc('b')]), { type: 'skip' });
    expect(s.queue.map((e) => e.id)).toEqual(['b']);
    expect(s.position).toBe(0);
    expect(s.phase).toBe('question');
    expect(s.skipped).toBe(1);
    expect(s.answered).toBe(0);
    const done = run(s, { type: 'skip' });
    expect(done.phase).toBe('done');
    expect(accuracy(done)).toBe(0);
  });
});
