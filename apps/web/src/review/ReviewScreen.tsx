import { Rating } from 'ts-fsrs';
import { Link } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { completeReviewSession, type ReviewGradeInput } from '../db/progress.js';
import { ExerciseBoundary } from '../exercises/components/ExerciseBoundary.js';
import { ExerciseView } from '../exercises/components/ExerciseView.js';
import { correctAnswerText, type Answer } from '../exercises/types.js';
import { gradeCard, getDueCards } from '../fsrs/scheduler.js';
import { requestSync } from '../sync/store.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { GradeSelector } from './GradeSelector.js';
import { generateReviewSession } from './review-exercises.js';
import {
  createReviewSession,
  currentReviewCard,
  reviewProgress,
  reviewReducer,
  type ReviewState,
} from './review-session.js';

export function ReviewScreen() {
  const content = useContent();
  const [cards, setCards] = useState<Awaited<ReturnType<typeof getDueCards>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDueCards(db, Date.now())
      .then(setCards)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) return <InlineError message={`Could not load review cards: ${error}`} />;
  if (cards === null) return <Loading label="Loading review…" />;
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-2xl font-semibold">All caught up!</h1>
        <p className="text-stone-600">No cards are due for review right now.</p>
        <Link to="/" className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white">
          Back to path
        </Link>
      </div>
    );
  }

  const allWordIds = Array.from(content.words.keys());
  const exercises = generateReviewSession(cards, content.words, allWordIds, Date.now());

  return <ReviewSessionRunner key={cards.length} exercises={exercises} cards={cards} />;
}

function ReviewSessionRunner({
  exercises,
  cards,
}: {
  exercises: ReturnType<typeof generateReviewSession>;
  cards: Awaited<ReturnType<typeof getDueCards>>;
}) {
  const [state, dispatch] = useReducer(reviewReducer, exercises, createReviewSession);
  const [answered, setAnswered] = useState<Answer | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (state.phase !== 'done' || recorded.current) return;
    recorded.current = true;

    const now = Date.now();
    const gradeInputs: ReviewGradeInput[] = state.grades.flatMap((g) => {
      const card = cards[g.exerciseIndex];
      if (!card) return [];
      const newFsrs = gradeCard(card.fsrs, g.rating, now);
      return [{ cardId: card.cardId, newFsrs }];
    });

    void completeReviewSession(db, gradeInputs, now).then(() => requestSync({ db }));
  }, [state.phase, state.grades, cards]);

  if (state.phase === 'done') return <ReviewResults state={state} />;

  const exercise = currentReviewCard(state);
  if (!exercise) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${Math.round(reviewProgress(state) * 100)}%` }}
          />
        </div>
        <span className="text-sm text-stone-600">
          {state.position + 1}/{state.exercises.length}
        </span>
      </div>

      <ExerciseBoundary
        key={`${exercise.id}:${state.position}`}
        onError={() => dispatch({ type: 'skip' })}
      >
        <ExerciseView
          exercise={exercise}
          answered={answered}
          onAnswer={(a) => {
            setAnswered(a);
            dispatch({ type: 'answer', answer: a });
          }}
        />
      </ExerciseBoundary>

      {state.phase === 'grading' && state.confirmedGrade !== null && (
        <div className="flex flex-col gap-3 rounded-lg bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-700">How well did you know this?</p>
          <GradeSelector
            selected={state.confirmedGrade}
            onSelect={(rating) => dispatch({ type: 'grade', rating })}
          />
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'grade', rating: state.confirmedGrade! });
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      )}

      {state.phase === 'feedback' && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg p-4 ${
            state.confirmedGrade !== null && state.confirmedGrade >= Rating.Good
              ? 'bg-green-50 text-green-900'
              : 'bg-red-50 text-red-900'
          }`}
        >
          <div>
            <p className="font-semibold">
              {state.confirmedGrade !== null && state.confirmedGrade >= Rating.Good
                ? 'Correct!'
                : 'Review again soon'}
            </p>
            {state.confirmedGrade !== null &&
              state.confirmedGrade < Rating.Good &&
              exercise.kind !== 'write-it' && (
                <p className="text-sm">Answer: {correctAnswerText(exercise)}</p>
              )}
          </div>
          <button
            type="button"
            onClick={() => {
              setAnswered(null);
              dispatch({ type: 'next' });
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewResults({ state }: { state: ReviewState }) {
  const acc = state.answered === 0 ? 0 : state.correct / state.answered;
  return (
    <div data-testid="review-results" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Review complete</h1>
      <p className="text-4xl font-semibold text-blue-700">{Math.round(acc * 100)}%</p>
      <p className="text-stone-600">accuracy</p>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-stone-700">
        <dt>Cards reviewed</dt>
        <dd className="font-medium">{state.answered}</dd>
        <dt>Correct</dt>
        <dd className="font-medium">{state.correct}</dd>
      </dl>
      <Link to="/" className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-medium text-white">
        Back to path
      </Link>
    </div>
  );
}
