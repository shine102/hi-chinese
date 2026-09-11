import type { Exercise } from '../types.js';
import { FillBlank } from './FillBlank.js';
import { ListenPick } from './ListenPick.js';
import { MatchPairs } from './MatchPairs.js';
import { MultipleChoice, type ExerciseProps } from './MultipleChoice.js';
import { SentenceBuilder } from './SentenceBuilder.js';
import { WriteIt } from './WriteIt.js';

export function ExerciseView({ exercise, answered, onAnswer }: ExerciseProps<Exercise>) {
  let body;
  switch (exercise.kind) {
    case 'multiple-choice':
      body = <MultipleChoice exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'listen-pick':
      body = <ListenPick exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'fill-blank':
      body = <FillBlank exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'sentence-builder':
      body = <SentenceBuilder exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'match-pairs':
      body = <MatchPairs exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
    case 'write-it':
      body = <WriteIt exercise={exercise} answered={answered} onAnswer={onAnswer} />;
      break;
  }
  return (
    <div data-testid="exercise" data-kind={exercise.kind}>
      {body}
    </div>
  );
}
