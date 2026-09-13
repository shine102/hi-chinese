export type ChoiceDirection = 'zh-en' | 'en-zh' | 'pinyin-zh';

export interface MultipleChoiceExercise {
  kind: 'multiple-choice';
  id: string;
  wordId: string;
  direction: ChoiceDirection;
  prompt: string;
  promptSub: string | null;
  /** Text to speak when the prompt is Chinese; null when audio would give the answer away. */
  speech: string | null;
  options: string[];
  correctIndex: number;
}

export interface ListenPickExercise {
  kind: 'listen-pick';
  id: string;
  wordId: string;
  speech: string;
  options: string[];
  correctIndex: number;
}

export interface MatchPairsExercise {
  kind: 'match-pairs';
  id: string;
  pairs: { wordId: string; zh: string; vi: string }[];
}

export interface SentenceBuilderExercise {
  kind: 'sentence-builder';
  id: string;
  sentenceId: string;
  vi: string;
  speech: string;
  answer: string[];
  /** Shuffled: the answer tokens plus two distractors. */
  tiles: string[];
}

export interface FillBlankExercise {
  kind: 'fill-blank';
  id: string;
  sentenceId: string;
  grammarId: string | null;
  tokens: string[];
  blankIndex: number;
  vi: string;
  options: string[];
  correctIndex: number;
}

export interface WriteItExercise {
  kind: 'write-it';
  id: string;
  character: string;
  showOutline: boolean;
}

export type Exercise =
  | MultipleChoiceExercise
  | ListenPickExercise
  | MatchPairsExercise
  | SentenceBuilderExercise
  | FillBlankExercise
  | WriteItExercise;

export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'order'; tiles: string[] }
  | { kind: 'pairs'; mismatches: number }
  | { kind: 'write'; totalMistakes: number; showedAnswer: boolean };

export function checkAnswer(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      return answer.kind === 'choice' && answer.index === exercise.correctIndex;
    case 'sentence-builder':
      return (
        answer.kind === 'order' &&
        answer.tiles.length === exercise.answer.length &&
        answer.tiles.every((t, i) => t === exercise.answer[i])
      );
    case 'match-pairs':
      return answer.kind === 'pairs' && answer.mismatches === 0;
    case 'write-it':
      return answer.kind === 'write' && !answer.showedAnswer;
  }
}

export function correctAnswerText(exercise: Exercise): string {
  switch (exercise.kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      return exercise.options[exercise.correctIndex] ?? '';
    case 'sentence-builder':
      return exercise.answer.join('');
    case 'match-pairs':
      return exercise.pairs.map((p) => `${p.zh} = ${p.vi}`).join(', ');
    case 'write-it':
      return exercise.character;
  }
}
