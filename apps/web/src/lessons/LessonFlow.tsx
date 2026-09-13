import type { GrammarPoint, Sentence, UnitChunk, Word } from '@hi-chinese/content';
import { uniqueHanChars } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useHasChineseVoice } from '../audio/speech.js';
import { SpeakButton, NoVoiceBanner } from '../audio/SpeakButton.js';
import type { ContentIndex } from '../content/index.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { markUnitStarted, completeLesson } from '../db/progress.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { ExerciseBoundary } from '../exercises/components/ExerciseBoundary.js';
import { ExerciseView } from '../exercises/components/ExerciseView.js';
import { checkAnswer, correctAnswerText, type Answer, type Exercise } from '../exercises/types.js';
import { HanziWriterComponent } from '../hanzi/HanziWriterComponent.js';
import { requestSync } from '../sync/store.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { computeLessons, type Lesson } from './compute.js';
import { generateSlides, type Slide } from './slides.js';

// ── Flow state ──────────────────────────────────────────────────────────

interface FlowState {
  slides: Slide[];
  position: number;
  retryQueue: Exercise[];
  phase: 'intro' | 'exercise' | 'feedback' | 'done';
  lastCorrect: boolean | null;
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

type FlowAction =
  | { type: 'continue' }
  | { type: 'answer'; answer: Answer }
  | { type: 'skip' };

function initFlow(slides: Slide[]): FlowState {
  if (slides.length === 0) return { slides, position: 0, retryQueue: [], phase: 'done', lastCorrect: null, answered: 0, correct: 0, streak: 0, bestStreak: 0 };
  const phase = slides[0]!.type === 'exercise' ? 'exercise' : 'intro';
  return { slides, position: 0, retryQueue: [], phase, lastCorrect: null, answered: 0, correct: 0, streak: 0, bestStreak: 0 };
}

function advancePhase(state: FlowState, nextPos: number): FlowState {
  if (nextPos < state.slides.length) {
    const next = state.slides[nextPos]!;
    return { ...state, position: nextPos, phase: next.type === 'exercise' ? 'exercise' : 'intro', lastCorrect: null };
  }
  if (state.retryQueue.length > 0) {
    const [retry, ...rest] = state.retryQueue;
    return {
      ...state,
      slides: [...state.slides, { type: 'exercise', exercise: retry! }],
      retryQueue: rest,
      position: nextPos,
      phase: 'exercise',
      lastCorrect: null,
    };
  }
  return { ...state, position: nextPos, phase: 'done' };
}

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'continue': {
      if (state.phase === 'intro') {
        return advancePhase(state, state.position + 1);
      }
      if (state.phase === 'feedback') {
        return advancePhase(state, state.position + 1);
      }
      return state;
    }
    case 'answer': {
      if (state.phase !== 'exercise') return state;
      const slide = state.slides[state.position];
      if (!slide || slide.type !== 'exercise') return state;
      const ok = checkAnswer(slide.exercise, action.answer);
      const streak = ok ? state.streak + 1 : 0;
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: ok,
        answered: state.answered + 1,
        correct: state.correct + (ok ? 1 : 0),
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        retryQueue: ok ? state.retryQueue : [...state.retryQueue, slide.exercise],
      };
    }
    case 'skip': {
      if (state.phase === 'done') return state;
      return advancePhase(state, state.position + 1);
    }
  }
}

function flowProgress(state: FlowState): number {
  const total = state.slides.length + state.retryQueue.length;
  return total === 0 ? 1 : Math.min(1, state.position / total);
}

// ── Slide components ────────────────────────────────────────────────────

function WordIntroSlide({ word, onContinue }: { word: Word; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="text-6xl">{word.simplified}</div>
      <div className="text-2xl text-red-700">{word.pinyin}</div>
      {word.hanViet && <div className="text-base italic text-stone-500">{word.hanViet}</div>}
      <SpeakButton text={word.simplified} size="lg" />
      {word.traditional !== word.simplified && (
        <div className="text-sm text-stone-500">Traditional: {word.traditional}</div>
      )}
      <ul className="text-center text-lg text-stone-800">
        {word.meanings.slice(0, 3).map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

function WordWritingSlide({ word, onContinue }: { word: Word; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-sm font-medium text-stone-600">Stroke order</p>
      <div className="flex gap-4">
        {word.characters.map((ch, i) => (
          <HanziWriterComponent key={`${ch}-${i}`} character={ch} mode="animate" width={140} height={140} />
        ))}
      </div>
      <div className="text-lg text-stone-700">
        {word.simplified} — {word.pinyin}
        {word.hanViet && ` · ${word.hanViet}`}
      </div>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

function GrammarIntroSlide({
  point,
  sentences,
  onContinue,
}: {
  point: GrammarPoint;
  sentences: Sentence[];
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-semibold">{point.title}</h2>
      <p className="font-mono text-sm text-red-800">{point.pattern}</p>
      <p className="text-sm text-stone-800">{point.explanation}</p>
      {sentences.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sentences.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2">
              <div>
                <div className="text-lg">{s.zh}</div>
                <div className="text-sm text-stone-600">{s.pinyin}</div>
                <div className="text-sm text-stone-800">{s.vi}</div>
              </div>
              <SpeakButton text={s.zh} />
            </li>
          ))}
        </ul>
      )}
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

function ReviewIntroSlide({
  words,
  onContinue,
}: {
  words: Word[];
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <h2 className="text-lg font-semibold">Quick review</h2>
      <p className="text-sm text-stone-600">Words from earlier lessons:</p>
      <ul className="flex flex-col gap-1">
        {words.map((w) => (
          <li key={w.id} className="flex items-center gap-3 text-sm text-stone-700">
            <span className="text-lg">{w.simplified}</span>
            <span className="text-stone-500">{w.pinyin}</span>
            {w.hanViet && <span className="italic text-stone-500">{w.hanViet}</span>}
            <span>{w.meanings[0]}</span>
          </li>
        ))}
      </ul>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-lg bg-red-700 px-4 py-3 font-medium text-white"
    >
      Continue
    </button>
  );
}

// ── Main flow ───────────────────────────────────────────────────────────

export function LessonFlowScreen() {
  const { unitId, lessonIdx: lessonIdxStr } = useParams({
    from: '/unit/$unitId/lesson/$lessonIdx',
  });
  const lessonIdx = Number(lessonIdxStr);
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const audio = useHasChineseVoice();

  useEffect(() => {
    void markUnitStarted(db, unitId, Date.now());
  }, [unitId]);

  if (chunk.status === 'loading') return <Loading label="Loading lesson…" />;
  if (chunk.status === 'error')
    return <InlineError message={`Could not load this unit: ${chunk.error.message}`} onRetry={chunk.retry} />;

  const lessons = computeLessons(chunk.chunk.unit, chunk.chunk.grammar, chunk.chunk.sentences);
  const lesson = lessons[lessonIdx];
  if (!lesson) return <p role="alert">Invalid lesson.</p>;

  return (
    <LessonFlowInner
      key={`${unitId}-${lessonIdx}`}
      chunk={chunk.chunk}
      lesson={lesson}
      totalLessons={lessons.length}
      content={content}
      audio={audio}
    />
  );
}

function LessonFlowInner({
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
  const slides = generateSlides({
    lesson,
    allSentences: chunk.sentences,
    allGrammar: chunk.grammar,
    words: content.words,
    levelWordIds: content.wordIdsByLevel.get(chunk.unit.level) ?? [],
    audio,
  }, Date.now());

  const [state, dispatch] = useReducer(flowReducer, slides, initFlow);
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
      lessonIndex: lesson.index,
      totalLessons,
      wordIds: lesson.wordIds,
      characters,
      now: Date.now(),
    }).then(() => requestSync({ db }));
  }, [state.phase, chunk, lesson, totalLessons, content, progress]);

  if (state.phase === 'done') {
    return <Results state={state} wordCount={lesson.wordIds.length} unitId={chunk.unit.id} last={isLastLesson} />;
  }

  const slide = state.slides[state.position];
  if (!slide) return <Loading />;

  const onContinue = () => {
    setAnswered(null);
    dispatch({ type: 'continue' });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-red-600 transition-all"
            style={{ width: `${Math.round(flowProgress(state) * 100)}%` }}
          />
        </div>
        <span className="text-sm text-stone-600">
          {state.position + 1}/{state.slides.length + state.retryQueue.length}
        </span>
      </div>
      {state.position === 0 && <NoVoiceBanner />}
      <SlideRenderer
        slide={slide}
        state={state}
        content={content}
        allGrammar={chunk.grammar}
        allSentences={chunk.sentences}
        answered={answered}
        onAnswer={(a) => {
          setAnswered(a);
          dispatch({ type: 'answer', answer: a });
        }}
        onContinue={onContinue}
        onSkip={() => dispatch({ type: 'skip' })}
      />
      {state.phase === 'feedback' && (
        <FeedbackBar
          correct={state.lastCorrect ?? false}
          exercise={slide.type === 'exercise' ? slide.exercise : null}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}

function SlideRenderer({
  slide,
  state,
  content,
  allGrammar,
  allSentences,
  answered,
  onAnswer,
  onContinue,
  onSkip,
}: {
  slide: Slide;
  state: FlowState;
  content: ContentIndex;
  allGrammar: readonly GrammarPoint[];
  allSentences: readonly Sentence[];
  answered: Answer | null;
  onAnswer: (a: Answer) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  switch (slide.type) {
    case 'word-intro': {
      const word = content.words.get(slide.wordId);
      return word ? <WordIntroSlide word={word} onContinue={onContinue} /> : null;
    }
    case 'word-writing': {
      const word = content.words.get(slide.wordId);
      return word ? <WordWritingSlide word={word} onContinue={onContinue} /> : null;
    }
    case 'grammar-intro': {
      const point = allGrammar.find((g) => g.id === slide.grammarId);
      const sentences = slide.sentenceIds.flatMap((sid) => {
        const s = allSentences.find((s) => s.id === sid);
        return s ? [s] : [];
      });
      return point ? <GrammarIntroSlide point={point} sentences={sentences} onContinue={onContinue} /> : null;
    }
    case 'review-intro': {
      const words = slide.wordIds.flatMap((id) => {
        const w = content.words.get(id);
        return w ? [w] : [];
      });
      return <ReviewIntroSlide words={words} onContinue={onContinue} />;
    }
    case 'exercise':
      return (
        <ExerciseBoundary
          key={`${slide.exercise.id}:${state.position}`}
          onError={onSkip}
        >
          <ExerciseView exercise={slide.exercise} answered={answered} onAnswer={onAnswer} />
        </ExerciseBoundary>
      );
  }
}

function FeedbackBar({
  correct,
  exercise,
  onContinue,
}: {
  correct: boolean;
  exercise: Exercise | null;
  onContinue: () => void;
}) {
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-lg p-4 ${
        correct ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
      }`}
    >
      <div>
        <p className="font-semibold">{correct ? 'Correct!' : 'Not quite'}</p>
        {!correct && exercise && <p className="text-sm">Answer: {correctAnswerText(exercise)}</p>}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md bg-stone-900 px-4 py-2 text-white"
      >
        Continue
      </button>
    </div>
  );
}

function Results({
  state,
  wordCount,
  unitId,
  last,
}: {
  state: FlowState;
  wordCount: number;
  unitId: string;
  last: boolean;
}) {
  const acc = state.answered === 0 ? 0 : state.correct / state.answered;
  return (
    <div data-testid="results" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">{last ? 'Unit complete!' : 'Lesson complete!'}</h1>
      <p className="text-4xl font-semibold text-red-700">{Math.round(acc * 100)}%</p>
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
