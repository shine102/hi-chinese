import { checkAnswer, type Answer, type Exercise } from './types.js';

export interface SessionState {
  queue: Exercise[];
  position: number;
  phase: 'question' | 'feedback' | 'done';
  lastCorrect: boolean | null;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  skipped: number;
}

export type SessionAction =
  { type: 'answer'; answer: Answer } | { type: 'next' } | { type: 'skip' };

export function createSession(exercises: readonly Exercise[]): SessionState {
  return {
    queue: [...exercises],
    position: 0,
    phase: exercises.length === 0 ? 'done' : 'question',
    lastCorrect: null,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    correct: 0,
    skipped: 0,
  };
}

export function currentExercise(state: SessionState): Exercise | null {
  return state.phase === 'done' ? null : (state.queue[state.position] ?? null);
}

export function sessionProgress(state: SessionState): number {
  return state.queue.length === 0 ? 1 : Math.min(1, state.position / state.queue.length);
}

export function accuracy(state: SessionState): number {
  return state.answered === 0 ? 0 : state.correct / state.answered;
}

/**
 * Spec §4 session rules: wrong answers go to the end of the queue; a streak
 * counts consecutive correct answers. `skip` is for a broken exercise (error
 * boundary): it is removed and never counted.
 */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const current = currentExercise(state);
  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'question' || !current) return state;
      const ok = checkAnswer(current, action.answer);
      const streak = ok ? state.streak + 1 : 0;
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: ok,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        answered: state.answered + 1,
        correct: state.correct + (ok ? 1 : 0),
        queue: ok ? state.queue : [...state.queue, current],
      };
    }
    case 'next': {
      if (state.phase !== 'feedback') return state;
      const position = state.position + 1;
      return { ...state, position, phase: position >= state.queue.length ? 'done' : 'question' };
    }
    case 'skip': {
      if (state.phase === 'done' || !current) return state;
      const queue = state.queue.filter((_, i) => i !== state.position);
      return {
        ...state,
        queue,
        skipped: state.skipped + 1,
        lastCorrect: null,
        phase: state.position >= queue.length ? 'done' : 'question',
      };
    }
  }
}
