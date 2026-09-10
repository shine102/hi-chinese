import { useEffect } from 'react';
import { SpeakButton } from '../../audio/SpeakButton.js';
import { speak } from '../../audio/speech.js';
import type { ListenPickExercise } from '../types.js';
import { ChoiceList } from './ChoiceList.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function ListenPick({ exercise, answered, onAnswer }: ExerciseProps<ListenPickExercise>) {
  useEffect(() => {
    speak(exercise.speech);
  }, [exercise.speech]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">Listen and pick what you heard</p>
      <div className="flex justify-center py-2">
        <SpeakButton text={exercise.speech} label="Play audio" size="lg" />
      </div>
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
