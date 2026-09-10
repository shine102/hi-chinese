import { SpeakButton } from '../../audio/SpeakButton.js';
import type { Answer, MultipleChoiceExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';

export interface ExerciseProps<E> {
  exercise: E;
  answered: Answer | null;
  onAnswer: (answer: Answer) => void;
}

const TITLES = {
  'zh-en': 'What does this mean?',
  'en-zh': 'Pick the Chinese',
  'pinyin-zh': 'Which word sounds like this?',
} as const;

export function MultipleChoice({
  exercise,
  answered,
  onAnswer,
}: ExerciseProps<MultipleChoiceExercise>) {
  const zhOptions = exercise.direction !== 'zh-en';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">{TITLES[exercise.direction]}</p>
      <div className="flex items-center gap-3">
        <div>
          <p className={exercise.direction === 'zh-en' ? 'text-4xl' : 'text-2xl'}>
            {exercise.prompt}
          </p>
          {exercise.promptSub && <p className="text-stone-600">{exercise.promptSub}</p>}
        </div>
        {exercise.speech && <SpeakButton text={exercise.speech} />}
      </div>
      <ChoiceList
        options={exercise.options}
        correctIndex={exercise.correctIndex}
        answered={answered}
        onAnswer={onAnswer}
        large={zhOptions}
      />
    </div>
  );
}
