import type { FillBlankExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function FillBlank({ exercise, answered, onAnswer }: ExerciseProps<FillBlankExercise>) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Fill in the blank</p>
      <p className="text-2xl leading-relaxed">
        {exercise.tokens.map((t, i) =>
          i === exercise.blankIndex ? (
            <span
              key={i}
              className="mx-1 inline-block min-w-12 border-b-2 border-stone-400 text-center"
            >
              {answered !== null ? exercise.options[exercise.correctIndex] : ' '}
            </span>
          ) : (
            <span key={i}>{t}</span>
          ),
        )}
      </p>
      <p className="text-stone-600">{exercise.en}</p>
      <ChoiceList
        options={exercise.options}
        correctIndex={exercise.correctIndex}
        answered={answered}
        onAnswer={onAnswer}
        large
      />
    </div>
  );
}
