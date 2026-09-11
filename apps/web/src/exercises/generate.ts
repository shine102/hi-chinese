import type { GrammarPoint, Sentence, Word } from '@hi-chinese/content';
import { mulberry32, pick, randomInt, shuffle, type Rng } from './random.js';
import type {
  ChoiceDirection,
  Exercise,
  FillBlankExercise,
  ListenPickExercise,
  MatchPairsExercise,
  MultipleChoiceExercise,
  SentenceBuilderExercise,
  WriteItExercise,
} from './types.js';

/** Session size scales with how much new material there is, capped at 15. */
export function sessionSize(newWordCount: number, reviewWordCount: number): number {
  return Math.min(15, 6 + newWordCount + Math.min(reviewWordCount, 3));
}

export interface SessionInput {
  /** This sub-lesson's words — every new word gets at least one exercise. */
  newWords: readonly Word[];
  /** Words from prior sub-lessons — used for review exercises. */
  reviewWords: readonly Word[];
  /** Grammar scoped to this sub-lesson. */
  grammar: readonly GrammarPoint[];
  /** Sentences scoped to this sub-lesson. */
  sentences: readonly Sentence[];
  /** Full word map for distractor lookups. */
  words: ReadonlyMap<string, Word>;
  /** All word IDs at this HSK level — broader distractor pool. */
  levelWordIds: readonly string[];
  /** False when no Chinese voice exists: listen-and-pick exercises are then skipped. */
  audio: boolean;
}

export function primaryMeaning(word: Word): string {
  const first = word.meanings[0] ?? word.simplified;
  const head = (first.split(';')[0] ?? first).trim();
  return head.length > 0 ? head : first.trim();
}

export function tokensOf(sentence: Sentence, words: ReadonlyMap<string, Word>): string[] {
  return sentence.wordIds.map((id) => words.get(id)?.simplified ?? id.replace(/^w:/, ''));
}

type IdGen = (kind: string) => string;

/** Candidate distractor words: this sub-lesson's new + review words (shuffled) first, then the rest of the level. */
function candidates(input: SessionInput, exclude: ReadonlySet<string>, rng: Rng): Word[] {
  const scoped = [...input.newWords, ...input.reviewWords];
  const scopedIds = new Set(scoped.map((w) => w.id));
  const out: Word[] = [];
  for (const w of shuffle(scoped, rng)) {
    if (exclude.has(w.id)) continue;
    out.push(w);
  }
  for (const id of shuffle(
    input.levelWordIds.filter((wid) => !scopedIds.has(wid)),
    rng,
  )) {
    if (exclude.has(id)) continue;
    const w = input.words.get(id);
    if (w) out.push(w);
  }
  return out;
}

function distinctTexts(
  pool: readonly Word[],
  render: (w: Word) => string,
  taken: ReadonlySet<string>,
  n: number,
  accept: (w: Word) => boolean = () => true,
): string[] {
  const seen = new Set(taken);
  const out: string[] = [];
  for (const w of pool) {
    if (!accept(w)) continue;
    const text = render(w);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
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

function multipleChoice(
  word: Word,
  direction: ChoiceDirection,
  input: SessionInput,
  rng: Rng,
  id: IdGen,
): MultipleChoiceExercise {
  const pool = candidates(input, new Set([word.id]), rng);
  if (direction === 'zh-en') {
    const correct = primaryMeaning(word);
    const { options, correctIndex } = withCorrect(
      correct,
      distinctTexts(pool, primaryMeaning, new Set([correct]), 3),
      rng,
    );
    return {
      kind: 'multiple-choice',
      id: id('mc'),
      wordId: word.id,
      direction,
      prompt: word.simplified,
      promptSub: word.pinyin,
      speech: word.simplified,
      options,
      correctIndex,
    };
  }
  const correct = word.simplified;
  // Homophones would make a pinyin prompt ambiguous, so they are never distractors.
  const notHomophone = (w: Word) => w.pinyin !== word.pinyin;
  const { options, correctIndex } = withCorrect(
    correct,
    distinctTexts(pool, (w) => w.simplified, new Set([correct]), 3, notHomophone),
    rng,
  );
  return {
    kind: 'multiple-choice',
    id: id('mc'),
    wordId: word.id,
    direction,
    prompt: direction === 'en-zh' ? primaryMeaning(word) : word.pinyin,
    promptSub: null,
    speech: null,
    options,
    correctIndex,
  };
}

function listenPick(word: Word, input: SessionInput, rng: Rng, id: IdGen): ListenPickExercise {
  const pool = candidates(input, new Set([word.id]), rng);
  const { options, correctIndex } = withCorrect(
    word.simplified,
    distinctTexts(
      pool,
      (w) => w.simplified,
      new Set([word.simplified]),
      3,
      (w) => w.pinyin !== word.pinyin,
    ),
    rng,
  );
  return {
    kind: 'listen-pick',
    id: id('lp'),
    wordId: word.id,
    speech: word.simplified,
    options,
    correctIndex,
  };
}

function matchPairs(unitWords: readonly Word[], rng: Rng, id: IdGen): MatchPairsExercise | null {
  const seen = new Set<string>();
  const pairs: MatchPairsExercise['pairs'] = [];
  for (const w of shuffle(unitWords, rng)) {
    const en = primaryMeaning(w);
    if (seen.has(en) || seen.has(w.simplified)) continue;
    seen.add(en);
    seen.add(w.simplified);
    pairs.push({ wordId: w.id, zh: w.simplified, en });
    if (pairs.length === 5) break;
  }
  return pairs.length === 5 ? { kind: 'match-pairs', id: id('mp'), pairs } : null;
}

function sentenceBuilder(
  sentence: Sentence,
  input: SessionInput,
  rng: Rng,
  id: IdGen,
): SentenceBuilderExercise {
  const answer = tokensOf(sentence, input.words);
  const pool = candidates(input, new Set(sentence.wordIds), rng);
  const distractors = distinctTexts(pool, (w) => w.simplified, new Set(answer), 2);
  return {
    kind: 'sentence-builder',
    id: id('sb'),
    sentenceId: sentence.id,
    en: sentence.en,
    speech: sentence.zh,
    answer,
    tiles: shuffle([...answer, ...distractors], rng),
  };
}

function fillBlank(
  sentence: Sentence,
  grammar: GrammarPoint | null,
  input: SessionInput,
  rng: Rng,
  id: IdGen,
): FillBlankExercise | null {
  const tokens = tokensOf(sentence, input.words);
  if (tokens.length < 2) return null;
  const newWordIds = new Set(input.newWords.map((w) => w.id));
  const preferred = sentence.wordIds.flatMap((wid, i) => (newWordIds.has(wid) ? [i] : []));
  const positions = preferred.length > 0 ? preferred : tokens.map((_, i) => i);
  const blankIndex = positions[randomInt(positions.length, rng)]!;
  const correct = tokens[blankIndex]!;
  const pool = candidates(input, new Set(sentence.wordIds), rng);
  const { options, correctIndex } = withCorrect(
    correct,
    distinctTexts(pool, (w) => w.simplified, new Set(tokens), 3),
    rng,
  );
  return {
    kind: 'fill-blank',
    id: id('fb'),
    sentenceId: sentence.id,
    grammarId: grammar?.id ?? null,
    tokens,
    blankIndex,
    en: sentence.en,
    options,
    correctIndex,
  };
}

function writeIt(character: string, rng: Rng, id: IdGen): WriteItExercise {
  return {
    kind: 'write-it',
    id: id('wr'),
    character,
    showOutline: true,
  };
}

/**
 * Spec §4 (sub-lesson scope): a session sized by `sessionSize` from this
 * sub-lesson's new words, sentences and grammar, plus a handful of review
 * exercises drawn from prior sub-lessons. Fill-the-blank per grammar point
 * (max 2), up to 2 sentence builders, one match-pairs, three listen-and-pick
 * when audio works, multiple choice for the new words (every word gets at
 * least one), and finally 2-3 review multiple-choice exercises when review
 * words are available. Wrong answers are re-queued by the session reducer,
 * not here.
 */
export function generateSession(input: SessionInput, seed: number): Exercise[] {
  const rng = mulberry32(seed);
  const { newWords, reviewWords, grammar, sentences } = input;
  const size = sessionSize(newWords.length, reviewWords.length);
  let counter = 0;
  const id: IdGen = (kind) => `${kind}:${++counter}`;
  const special: Exercise[] = [];

  const usedSentences = new Set<string>();
  for (const g of grammar.slice(0, 2)) {
    const sentence = g.sentenceIds
      .map((sid) => sentences.find((s) => s.id === sid))
      .find((s): s is Sentence => s !== undefined && s.wordIds.length >= 2);
    if (!sentence) continue;
    const ex = fillBlank(sentence, g, input, rng, id);
    if (ex) {
      special.push(ex);
      usedSentences.add(sentence.id);
    }
  }

  const builderSentences = shuffle(
    sentences.filter((s) => s.wordIds.length >= 3),
    rng,
  )
    .sort((a, b) => Number(usedSentences.has(a.id)) - Number(usedSentences.has(b.id)))
    .slice(0, 2);
  for (const s of builderSentences) special.push(sentenceBuilder(s, input, rng, id));

  const pairs = matchPairs([...newWords, ...reviewWords], rng, id);
  if (pairs) special.push(pairs);

  const newWordChars = new Set<string>();
  for (const w of newWords) for (const ch of w.characters) newWordChars.add(ch);
  const writeChars = shuffle(Array.from(newWordChars), rng).slice(0, rng() < 0.5 ? 1 : 2);
  for (const ch of writeChars) special.push(writeIt(ch, rng, id));

  if (input.audio)
    for (const w of pick(newWords, 3, rng)) special.push(listenPick(w, input, rng, id));

  const directions: ChoiceDirection[] = ['zh-en', 'en-zh', 'pinyin-zh'];

  // 2-3 review MCs from prior sub-lessons, when there are any review words.
  const reviewPool = reviewWords.length > 0 ? shuffle(reviewWords, rng) : [];
  const reviewCount = reviewPool.length > 0 ? Math.min(3, Math.max(2, reviewPool.length)) : 0;
  const reviewChoices: Exercise[] = [];
  for (let i = 0; i < reviewCount; i++) {
    const w = reviewPool[i % reviewPool.length]!;
    reviewChoices.push(multipleChoice(w, directions[i % directions.length]!, input, rng, id));
  }

  // New-word MCs fill the rest of the budget; every new word gets a direction
  // in the first round before any word repeats in a later round.
  const budget = Math.max(0, size - special.length - reviewChoices.length);
  const order = shuffle(newWords, rng);
  const choices: Exercise[] = [];
  outer: for (let round = 0; round < directions.length; round++) {
    for (let i = 0; i < order.length; i++) {
      if (choices.length >= budget) break outer;
      choices.push(
        multipleChoice(order[i]!, directions[(i + round) % directions.length]!, input, rng, id),
      );
    }
  }

  const session = shuffle([...special, ...choices, ...reviewChoices], rng);
  const firstChoice = session.findIndex((e) => e.kind === 'multiple-choice');
  if (firstChoice > 0) {
    const [mc] = session.splice(firstChoice, 1);
    session.unshift(mc!);
  }
  return session;
}
