import { useMemo, useState } from 'react';
import { speak } from '../../audio/speech.js';
import { devAttr } from '../dev-attrs.js';
import type { SentenceBuilderExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

/** Maps each tile index to the answer position it can fill (duplicates get distinct positions). */
function answerPositions(tiles: readonly string[], answer: readonly string[]): Map<number, number> {
  const map = new Map<number, number>();
  const used = new Set<number>();
  answer.forEach((token, pos) => {
    const tileIndex = tiles.findIndex((t, i) => t === token && !used.has(i));
    if (tileIndex >= 0) {
      used.add(tileIndex);
      map.set(tileIndex, pos);
    }
  });
  return map;
}

export function SentenceBuilder({
  exercise,
  answered,
  onAnswer,
}: ExerciseProps<SentenceBuilderExercise>) {
  const [placed, setPlaced] = useState<number[]>([]);
  const positions = useMemo(() => answerPositions(exercise.tiles, exercise.answer), [exercise]);
  const locked = answered !== null;
  const placedSet = new Set(placed);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Build the sentence</p>
      <p className="text-lg text-stone-800">{exercise.en}</p>
      <div
        data-testid="tile-answer"
        className="flex min-h-14 flex-wrap gap-2 rounded-lg border-2 border-dashed border-stone-300 p-2"
      >
        {placed.map((tileIndex) => (
          <button
            key={tileIndex}
            type="button"
            disabled={locked}
            onClick={() => setPlaced((p) => p.filter((i) => i !== tileIndex))}
            className="rounded-md bg-red-700 px-3 py-2 text-xl text-white"
          >
            {exercise.tiles[tileIndex]}
          </button>
        ))}
      </div>
      <div data-testid="tile-bank" className="flex flex-wrap gap-2">
        {exercise.tiles.map((tile, i) =>
          placedSet.has(i) ? (
            <span key={i} className="invisible rounded-md border px-3 py-2 text-xl">
              {tile}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => {
                speak(tile);
                setPlaced((p) => [...p, i]);
              }}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xl"
              {...(positions.has(i) ? devAttr('data-answer-index', positions.get(i)!) : {})}
            >
              {tile}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        disabled={locked || placed.length === 0}
        onClick={() => onAnswer({ kind: 'order', tiles: placed.map((i) => exercise.tiles[i]!) })}
        className="rounded-lg bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        Check
      </button>
    </div>
  );
}
