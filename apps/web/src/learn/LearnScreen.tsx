import type { GrammarPoint, Sentence, Word } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { NoVoiceBanner, SpeakButton } from '../audio/SpeakButton.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { markUnitStarted } from '../db/progress.js';
import { StrokesSheet } from '../hanzi/StrokesSheet.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function WordCard({ word }: { word: Word }) {
  const [showStrokes, setShowStrokes] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <div className="text-3xl">
          {[...word.simplified].map((ch, i) => (
            <Link
              key={i}
              to="/character/$charCode"
              params={{ charCode: ch.codePointAt(0)!.toString(16).padStart(4, '0') }}
              className="hover:text-red-700 hover:underline"
            >
              {ch}
            </Link>
          ))}
        </div>
        <div className="text-stone-600">{word.pinyin}</div>
        <ul className="mt-1 text-sm text-stone-800">
          {word.meanings.slice(0, 2).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        {word.traditional !== word.simplified && (
          <div className="mt-1 text-xs text-stone-500">Traditional: {word.traditional}</div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <SpeakButton text={word.simplified} />
        {word.characters.length > 0 && (
          <button
            type="button"
            onClick={() => setShowStrokes(true)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700"
            aria-label={`Strokes for ${word.simplified}`}
          >
            Strokes
          </button>
        )}
      </div>
      {showStrokes && <StrokesSheet word={word} onClose={() => setShowStrokes(false)} />}
    </li>
  );
}

export function GrammarCard({ point, examples }: { point: GrammarPoint; examples: Sentence[] }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">{point.title}</h3>
      <p className="font-mono text-sm text-red-800">{point.pattern}</p>
      <p className="text-sm text-stone-800">{point.explanation}</p>
      <ul className="mt-1 flex flex-col gap-2">
        {examples.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2"
          >
            <div>
              <div className="text-lg">{s.zh}</div>
              <div className="text-sm text-stone-600">{s.pinyin}</div>
              <div className="text-sm text-stone-800">{s.en}</div>
            </div>
            <SpeakButton text={s.zh} />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function LearnScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId/learn' });
  const content = useContent();
  const chunk = useUnitChunk(unitId);

  useEffect(() => {
    void markUnitStarted(db, unitId, Date.now());
  }, [unitId]);

  if (chunk.status === 'loading') return <Loading label="Loading unit…" />;
  if (chunk.status === 'error')
    return (
      <InlineError
        message={`Could not load this unit: ${chunk.error.message}`}
        onRetry={chunk.retry}
      />
    );

  const { unit, grammar, sentences } = chunk.chunk;
  const sentenceById = new Map(sentences.map((s) => [s.id, s] as const));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{unit.title}: Learn</h1>
      <NoVoiceBanner />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New words</h2>
        <ul className="flex flex-col gap-2">
          {unit.wordIds.map((id) => {
            const word = content.words.get(id);
            return word ? <WordCard key={id} word={word} /> : null;
          })}
        </ul>
      </section>
      {grammar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Grammar</h2>
          {grammar.map((g) => (
            <GrammarCard
              key={g.id}
              point={g}
              examples={g.sentenceIds.flatMap((sid) => {
                const s = sentenceById.get(sid);
                return s ? [s] : [];
              })}
            />
          ))}
        </section>
      )}
      <Link
        to="/unit/$unitId/practice"
        params={{ unitId }}
        className="rounded-lg bg-red-700 px-4 py-3 text-center font-medium text-white"
      >
        Start practice
      </Link>
    </div>
  );
}
