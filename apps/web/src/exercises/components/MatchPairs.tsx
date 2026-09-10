import { useEffect, useMemo, useState } from 'react';
import { devAttr } from '../dev-attrs.js';
import { mulberry32, shuffle } from '../random.js';
import type { MatchPairsExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function MatchPairs({ exercise, answered, onAnswer }: ExerciseProps<MatchPairsExercise>) {
  // Right column order is fixed per exercise id so re-renders never reshuffle it.
  const rightOrder = useMemo(() => {
    let seed = 0;
    for (const ch of exercise.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    return shuffle(
      exercise.pairs.map((_, i) => i),
      mulberry32(seed),
    );
  }, [exercise]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [mismatches, setMismatches] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const done = matched.size === exercise.pairs.length;

  useEffect(() => {
    if (done && answered === null) onAnswer({ kind: 'pairs', mismatches });
    // onAnswer changes identity per render; firing once per completion is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function pickRight(i: number): void {
    if (selectedLeft === null || matched.has(i)) return;
    if (i === selectedLeft) {
      setMatched((m) => new Set(m).add(i));
    } else {
      setMismatches((n) => n + 1);
      setShake(i);
      setTimeout(() => setShake(null), 300);
    }
    setSelectedLeft(null);
  }

  const base = 'w-full rounded-lg border px-3 py-3 text-left disabled:opacity-40';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Match the pairs</p>
      <div data-testid="exercise-pairs" className="grid grid-cols-2 gap-2">
        <ul className="flex flex-col gap-2">
          {exercise.pairs.map((p, i) => (
            <li key={p.wordId}>
              <button
                type="button"
                disabled={matched.has(i) || answered !== null}
                onClick={() => setSelectedLeft(i)}
                className={`${base} text-2xl ${selectedLeft === i ? 'border-red-600 bg-red-50' : 'border-stone-300 bg-white'}`}
                {...devAttr('data-pair-left', i)}
              >
                {p.zh}
              </button>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2">
          {rightOrder.map((i) => (
            <li key={exercise.pairs[i]!.wordId}>
              <button
                type="button"
                disabled={matched.has(i) || answered !== null}
                onClick={() => pickRight(i)}
                className={`${base} ${shake === i ? 'border-red-500 bg-red-50' : 'border-stone-300 bg-white'}`}
                {...devAttr('data-pair-right', i)}
              >
                {exercise.pairs[i]!.en}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
