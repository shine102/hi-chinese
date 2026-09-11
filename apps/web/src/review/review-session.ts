import { Rating } from 'ts-fsrs';
import { checkAnswer, type Answer, type Exercise } from '../exercises/types.js';

export function suggestWriteGrade(totalMistakes: number, showedAnswer: boolean): Rating {
  if (showedAnswer) return Rating.Again;
  if (totalMistakes === 0) return Rating.Easy;
  if (totalMistakes <= 2) return Rating.Good;
  return Rating.Hard;
}

function mcGrade(correct: boolean): Rating {
  return correct ? Rating.Good : Rating.Again;
}

export interface ReviewGrade {
  exerciseIndex: number;
  rating: Rating;
}

export interface ReviewState {
  exercises: Exercise[];
  position: number;
  phase: 'question' | 'feedback' | 'grading' | 'done';
  currentAnswer: Answer | null;
  suggestedGrade: Rating | null;
  confirmedGrade: Rating | null;
  grades: ReviewGrade[];
  correct: number;
  answered: number;
  skipped: number;
}

export type ReviewAction =
  | { type: 'answer'; answer: Answer }
  | { type: 'grade'; rating: Rating }
  | { type: 'next' }
  | { type: 'skip' };

export function createReviewSession(exercises: readonly Exercise[]): ReviewState {
  return {
    exercises: [...exercises],
    position: 0,
    phase: exercises.length === 0 ? 'done' : 'question',
    currentAnswer: null,
    suggestedGrade: null,
    confirmedGrade: null,
    grades: [],
    correct: 0,
    answered: 0,
    skipped: 0,
  };
}

export function currentReviewCard(state: ReviewState): Exercise | null {
  return state.phase === 'done' ? null : (state.exercises[state.position] ?? null);
}

export function reviewProgress(state: ReviewState): number {
  return state.exercises.length === 0 ? 1 : Math.min(1, state.position / state.exercises.length);
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  const current = currentReviewCard(state);

  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'question' || !current) return state;
      const isCorrect = checkAnswer(current, action.answer);

      if (current.kind === 'write-it' && action.answer.kind === 'write') {
        const suggested = suggestWriteGrade(
          action.answer.totalMistakes,
          action.answer.showedAnswer,
        );
        return {
          ...state,
          phase: 'grading',
          currentAnswer: action.answer,
          suggestedGrade: suggested,
          confirmedGrade: suggested,
          answered: state.answered + 1,
          correct: state.correct + (isCorrect ? 1 : 0),
        };
      }

      const grade = mcGrade(isCorrect);
      return {
        ...state,
        phase: 'feedback',
        currentAnswer: action.answer,
        suggestedGrade: grade,
        confirmedGrade: grade,
        answered: state.answered + 1,
        correct: state.correct + (isCorrect ? 1 : 0),
      };
    }

    case 'grade': {
      if (state.phase !== 'grading') return state;
      return {
        ...state,
        phase: 'feedback',
        confirmedGrade: action.rating,
      };
    }

    case 'next': {
      if (state.phase !== 'feedback' || state.confirmedGrade === null) return state;
      const grades = [
        ...state.grades,
        { exerciseIndex: state.position, rating: state.confirmedGrade },
      ];
      const position = state.position + 1;
      return {
        ...state,
        grades,
        position,
        phase: position >= state.exercises.length ? 'done' : 'question',
        currentAnswer: null,
        suggestedGrade: null,
        confirmedGrade: null,
      };
    }

    case 'skip': {
      if (state.phase !== 'question' || !current) return state;
      const exercises = state.exercises.filter((_, i) => i !== state.position);
      return {
        ...state,
        exercises,
        skipped: state.skipped + 1,
        currentAnswer: null,
        suggestedGrade: null,
        confirmedGrade: null,
        phase: state.position >= exercises.length ? 'done' : 'question',
      };
    }
  }
}
