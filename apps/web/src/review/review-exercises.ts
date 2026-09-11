import { parseCardId, type CardRow } from '@hi-chinese/content';
import type { Word } from '@hi-chinese/content';
import { primaryMeaning } from '../exercises/generate.js';
import { mulberry32, randomInt, shuffle, type Rng } from '../exercises/random.js';
import type { Exercise, MultipleChoiceExercise, WriteItExercise } from '../exercises/types.js';

function distinctMeanings(
  pool: readonly Word[],
  exclude: ReadonlySet<string>,
  n: number,
): string[] {
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const w of pool) {
    const m = primaryMeaning(w);
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
    if (out.length === n) break;
  }
  return out;
}

function distinctSimplified(
  pool: readonly Word[],
  exclude: ReadonlySet<string>,
  n: number,
): string[] {
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const w of pool) {
    if (seen.has(w.simplified)) continue;
    seen.add(w.simplified);
    out.push(w.simplified);
    if (out.length === n) break;
  }
  return out;
}

function withCorrect(
  correct: string,
  distractors: string[],
  rng: Rng,
): { options: string[]; correctIndex: number } {
  const correctIndex = randomInt(distractors.length + 1, rng);
  const options = [...distractors];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

export function cardToExercise(
  card: CardRow,
  words: ReadonlyMap<string, Word>,
  allWordIds: readonly string[],
  rng: Rng,
): Exercise | null {
  const parsed = parseCardId(card.cardId);
  if (!parsed) return null;

  if (parsed.kind === 'char-write') {
    const ex: WriteItExercise = {
      kind: 'write-it',
      id: card.cardId,
      character: parsed.itemId,
      showOutline: false,
    };
    return ex;
  }

  const word = words.get(parsed.itemId);
  if (!word) return null;

  const pool = shuffle(
    allWordIds.flatMap((id) => {
      const w = words.get(id);
      return w && w.id !== word.id ? [w] : [];
    }),
    rng,
  );

  if (parsed.kind === 'word-recognition') {
    const correct = primaryMeaning(word);
    const { options, correctIndex } = withCorrect(
      correct,
      distinctMeanings(pool, new Set([correct]), 3),
      rng,
    );
    const ex: MultipleChoiceExercise = {
      kind: 'multiple-choice',
      id: card.cardId,
      wordId: word.id,
      direction: 'zh-en',
      prompt: word.simplified,
      promptSub: word.pinyin,
      speech: word.simplified,
      options,
      correctIndex,
    };
    return ex;
  }

  // word-recall: en → zh
  const correct = word.simplified;
  const { options, correctIndex } = withCorrect(
    correct,
    distinctSimplified(pool, new Set([correct]), 3),
    rng,
  );
  const ex: MultipleChoiceExercise = {
    kind: 'multiple-choice',
    id: card.cardId,
    wordId: word.id,
    direction: 'en-zh',
    prompt: primaryMeaning(word),
    promptSub: null,
    speech: null,
    options,
    correctIndex,
  };
  return ex;
}

export function generateReviewSession(
  cards: readonly CardRow[],
  words: ReadonlyMap<string, Word>,
  allWordIds: readonly string[],
  seed: number,
): Exercise[] {
  const rng = mulberry32(seed);
  const shuffled = shuffle([...cards], rng);
  const exercises: Exercise[] = [];
  for (const card of shuffled) {
    const ex = cardToExercise(card, words, allWordIds, rng);
    if (ex) exercises.push(ex);
  }
  return exercises;
}
