import { uniqueHanChars, type UnitChunk } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useHasChineseVoice } from '../audio/speech.js';
import type { ContentIndex } from '../content/index.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { completeLesson } from '../db/progress.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { ExerciseBoundary } from '../exercises/components/ExerciseBoundary.js';
import { ExerciseView } from '../exercises/components/ExerciseView.js';
import { generateSession } from '../exercises/generate.js';
import {
  accuracy,
  createSession,
  currentExercise,
  sessionProgress,
  sessionReducer,
  type SessionState,
} from '../exercises/session.js';
import { correctAnswerText, type Answer } from '../exercises/types.js';
import { computeLessons, type Lesson } from '../lessons/compute.js';
import { requestSync } from '../sync/store.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function PracticeScreen() {
  const { unitId, lessonIdx: lessonIdxStr } = useParams({
    from: '/unit/$unitId/lesson/$lessonIdx/practice',
  });
  const lessonIdx = Number(lessonIdxStr);
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const audio = useHasChineseVoice();

  if (chunk.status === 'loading') return <Loading label="Preparing exercises…" />;
  if (chunk.status === 'error')
    return (
      <InlineError
        message={`Could not load this unit: ${chunk.error.message}`}
        onRetry={chunk.retry}
      />
    );

  const lessons = computeLessons(chunk.chunk.unit, chunk.chunk.grammar, chunk.chunk.sentences);
  const lesson = lessons[lessonIdx];
  if (!lesson) return <p role="alert">Invalid lesson.</p>;

  return (
    <PracticeSession
      key={`${unitId}-${lessonIdx}`}
      chunk={chunk.chunk}
      lesson={lesson}
      totalLessons={lessons.length}
      content={content}
      audio={audio}
    />
  );
}

function PracticeSession({
  chunk,
  lesson,
  totalLessons,
  content,
  audio,
}: {
  chunk: UnitChunk;
  lesson: Lesson;
  totalLessons: number;
  content: ContentIndex;
  audio: boolean;
}) {
  const resolveWords = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const w = content.words.get(id);
      return w ? [w] : [];
    });

  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(
      generateSession(
        {
          newWords: resolveWords(lesson.wordIds),
          reviewWords: resolveWords(lesson.reviewWordIds),
          grammar: lesson.grammarIds.flatMap((gid) => {
            const g = chunk.grammar.find((g) => g.id === gid);
            return g ? [g] : [];
          }),
          sentences: lesson.sentenceIds.flatMap((sid) => {
            const s = chunk.sentences.find((s) => s.id === sid);
            return s ? [s] : [];
          }),
          words: content.words,
          levelWordIds: content.wordIdsByLevel.get(chunk.unit.level) ?? [],
          audio,
        },
        Date.now(),
      ),
    ),
  );
  const [answered, setAnswered] = useState<Answer | null>(null);
  const recorded = useRef(false);
  const progress = useLiveQuery(() => db.unitProgress.get(chunk.unit.id), [chunk.unit.id]);
  const isLastLesson = lesson.index + 1 >= totalLessons;

  useEffect(() => {
    if (state.phase !== 'done' || recorded.current) return;
    if (progress === undefined) return;
    if (progress?.status === 'completed') return;
    recorded.current = true;
    const characters = uniqueHanChars(
      lesson.wordIds.map((id) => content.words.get(id)?.simplified ?? '').join(''),
    );
    void completeLesson(db, {
      unitId: chunk.unit.id,
      totalLessons,
      wordIds: lesson.wordIds,
      characters,
      now: Date.now(),
    }).then(() => requestSync({ db }));
  }, [state.phase, chunk, lesson, totalLessons, content, progress]);

  if (state.phase === 'done')
    return (
      <Results
        state={state}
        wordCount={lesson.wordIds.length}
        unitId={chunk.unit.id}
        last={isLastLesson}
      />
    );

  const exercise = currentExercise(state);
  if (!exercise) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-red-600 transition-all"
            style={{ width: `${Math.round(sessionProgress(state) * 100)}%` }}
          />
        </div>
        <span className="text-sm text-stone-600" aria-label="streak">
          {state.streak} in a row
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
      {state.phase === 'feedback' && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg p-4 ${
            state.lastCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}
        >
          <div>
            <p className="font-semibold">{state.lastCorrect ? 'Correct!' : 'Not quite'}</p>
            {!state.lastCorrect && <p className="text-sm">Answer: {correctAnswerText(exercise)}</p>}
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

function Results({
  state,
  wordCount,
  unitId,
  last,
}: {
  state: SessionState;
  wordCount: number;
  unitId: string;
  last: boolean;
}) {
  return (
    <div data-testid="results" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">{last ? 'Unit complete!' : 'Lesson complete!'}</h1>
      <p className="text-4xl font-semibold text-red-700">{Math.round(accuracy(state) * 100)}%</p>
      <p className="text-stone-600">accuracy</p>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-stone-700">
        <dt>Words learned</dt>
        <dd className="font-medium">{wordCount}</dd>
        <dt>Best streak</dt>
        <dd className="font-medium">{state.bestStreak}</dd>
        <dt>Answers</dt>
        <dd className="font-medium">{state.answered}</dd>
      </dl>
      {last ? (
        <Link to="/" className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white">
          Back to path
        </Link>
      ) : (
        <Link
          to="/unit/$unitId"
          params={{ unitId }}
          className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white"
        >
          Next lesson
        </Link>
      )}
    </div>
  );
}
