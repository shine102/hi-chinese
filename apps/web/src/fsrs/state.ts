import type { FsrsState } from '@hi-chinese/content';
import { createEmptyCard, type Card, type State } from 'ts-fsrs';

export function toFsrsState(card: Card): FsrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

export function fromFsrsState(state: FsrsState): Card {
  const card: Card = {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    // Deprecated in ts-fsrs 5 and not persisted; the scheduler derives elapsed time from last_review.
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
  };
  if (state.lastReview !== null) card.last_review = new Date(state.lastReview);
  return card;
}

export function emptyFsrsState(now: number): FsrsState {
  return toFsrsState(createEmptyCard(new Date(now)));
}
