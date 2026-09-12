import type { CharacterData } from '@hi-chinese/content';
import { useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../../content/loader.js';
import { HanziWriterComponent } from '../../hanzi/HanziWriterComponent.js';
import { Loading } from '../../ui/Loading.js';
import { devAttr } from '../dev-attrs.js';
import type { WriteItExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function WriteIt({ exercise, answered, onAnswer }: ExerciseProps<WriteItExercise>) {
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadCharacter(exercise.character).then((data) => {
      if (!cancelled) setCharData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [exercise.character]);

  if (!charData && !answered) return <Loading label="Loading character…" />;

  const pinyin = charData?.pinyin.join(', ') ?? '';
  const hanViet = charData?.hanViet ?? '';
  const meaning = charData?.definition ?? '';

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-stone-500">
        {exercise.showOutline ? 'Trace the character' : 'Write from memory'}
      </p>
      <div className="text-center">
        <p className="text-lg font-medium">{pinyin}</p>
        {hanViet && <p className="text-sm italic text-stone-500">{hanViet}</p>}
        <p className="text-sm text-stone-600">{meaning}</p>
      </div>
      {answered ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-6xl">{exercise.character}</div>
          <p className="text-sm text-stone-500">
            {mistakes === 0 ? 'Perfect!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border-2 border-stone-200 bg-white">
            <HanziWriterComponent
              character={exercise.character}
              mode="quiz"
              showOutline={exercise.showOutline}
              width={250}
              height={250}
              onQuizComplete={(summary) => {
                setMistakes(summary.totalMistakes);
                onAnswer({
                  kind: 'write',
                  totalMistakes: summary.totalMistakes,
                  showedAnswer: false,
                });
              }}
              onMistake={() => {
                mistakesRef.current++;
                setMistakes(mistakesRef.current);
              }}
            />
          </div>
          {!exercise.showOutline && (
            <button
              type="button"
              onClick={() => {
                onAnswer({ kind: 'write', totalMistakes: 0, showedAnswer: true });
              }}
              className="text-sm text-stone-500 underline"
              {...devAttr('data-show-answer', 'true')}
            >
              Show me
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onAnswer({ kind: 'write', totalMistakes: 0, showedAnswer: false });
            }}
            className="hidden"
            {...devAttr('data-auto-complete', 'true')}
          >
            Auto-complete
          </button>
        </>
      )}
    </div>
  );
}
