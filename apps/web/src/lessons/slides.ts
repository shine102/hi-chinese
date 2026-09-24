import type { GrammarPoint, Sentence, Word } from '@hi-chinese/content';
import {
  fillBlank,
  listenPick,
  matchPairs,
  multipleChoice,
  sentenceBuilder,
  writeIt,
  type IdGen,
  type SessionInput,
} from '../exercises/generate.js';
import { mulberry32, pick, shuffle } from '../exercises/random.js';
import type { ChoiceDirection, Exercise } from '../exercises/types.js';
import type { Lesson } from './compute.js';

export type Slide =
  | { type: 'word-intro'; wordId: string }
  | { type: 'word-writing'; wordId: string }
  | { type: 'grammar-intro'; grammarId: string; sentenceIds: string[] }
  | { type: 'review-intro'; wordIds: string[] }
  | { type: 'exercise'; exercise: Exercise };

export interface SlideInput {
  lesson: Lesson;
  allSentences: readonly Sentence[];
  allGrammar: readonly GrammarPoint[];
  words: ReadonlyMap<string, Word>;
  levelWordIds: readonly string[];
  audio: boolean;
}

export function generateSlides(input: SlideInput, seed: number): Slide[] {
  const rng = mulberry32(seed);
  const { lesson, allSentences, allGrammar, words, levelWordIds, audio } = input;
  let counter = 0;
  const id: IdGen = (kind) => `${kind}:${++counter}`;

  const resolveWords = (ids: readonly string[]) =>
    ids.flatMap((wid) => {
      const w = words.get(wid);
      return w ? [w] : [];
    });

  const newWords = resolveWords(lesson.wordIds);
  const reviewWords = resolveWords(lesson.reviewWordIds);
  const grammar = lesson.grammarIds.flatMap((gid) => {
    const g = allGrammar.find((g) => g.id === gid);
    return g ? [g] : [];
  });
  const sentences = lesson.sentenceIds.flatMap((sid) => {
    const s = allSentences.find((s) => s.id === sid);
    return s ? [s] : [];
  });

  const sessionInput: SessionInput = {
    newWords,
    reviewWords,
    grammar,
    sentences,
    words,
    levelWordIds,
    audio,
  };

  const slides: Slide[] = [];
  const directions: ChoiceDirection[] = ['zh-en', 'en-zh', 'pinyin-zh'];

  // Phase 1: Introduce new words in pairs, with exercises after each pair
  for (let i = 0; i < newWords.length; i++) {
    const word = newWords[i]!;
    slides.push({ type: 'word-intro', wordId: word.id });
    if (word.characters.length > 0) {
      slides.push({ type: 'word-writing', wordId: word.id });
    }

    // After every 2 words (or the last word), add MC exercises
    if (i % 2 === 1 || i === newWords.length - 1) {
      const batch = i % 2 === 1 ? [newWords[i - 1]!, word] : [word];
      for (const w of batch) {
        slides.push({
          type: 'exercise',
          exercise: multipleChoice(w, directions[i % directions.length]!, sessionInput, rng, id),
        });
      }
    }
  }

  // Phase 2: Grammar intro + grammar exercises
  const sentenceById = new Map(allSentences.map((s) => [s.id, s] as const));
  const usedSentences = new Set<string>();

  // Words of this unit that are taught in a later lesson; words from earlier
  // units count as known.
  const unitId = newWords[0]?.unitId ?? reviewWords[0]?.unitId;
  const knownInUnit = new Set([...lesson.wordIds, ...lesson.reviewWordIds]);
  const isLaterLessonWord = (wid: string) =>
    words.get(wid)?.unitId === unitId && !knownInUnit.has(wid);

  for (const g of grammar) {
    // Only sentences shipped with this unit can be shown.
    const unitSentenceIds = g.sentenceIds.filter((sid) => sentenceById.has(sid));
    // Show only sentences available at this lesson or earlier
    const availableSentenceIds = unitSentenceIds.filter(
      (sid) => !sentenceById.get(sid)!.wordIds.some(isLaterLessonWord),
    );

    if (availableSentenceIds.length > 0 || g.explanation.length > 0) {
      slides.push({
        type: 'grammar-intro',
        grammarId: g.id,
        sentenceIds: availableSentenceIds.length > 0 ? availableSentenceIds : unitSentenceIds.slice(0, 2),
      });
    }

    // Fill-blank from grammar sentences
    const fbSentence = g.sentenceIds
      .map((sid) => sentences.find((s) => s.id === sid))
      .find((s): s is Sentence => s !== undefined && s.wordIds.length >= 2);
    if (fbSentence) {
      const ex = fillBlank(fbSentence, g, sessionInput, rng, id);
      if (ex) {
        slides.push({ type: 'exercise', exercise: ex });
        usedSentences.add(fbSentence.id);
      }
    }
  }

  // Sentence builder from remaining sentences
  const builderSentences = shuffle(
    sentences.filter((s) => s.wordIds.length >= 3),
    rng,
  )
    .sort((a, b) => Number(usedSentences.has(a.id)) - Number(usedSentences.has(b.id)))
    .slice(0, 2);
  for (const s of builderSentences) {
    slides.push({ type: 'exercise', exercise: sentenceBuilder(s, sessionInput, rng, id) });
  }

  // Phase 3: Mixed practice
  const pairs = matchPairs([...newWords, ...reviewWords], rng, id);
  if (pairs) slides.push({ type: 'exercise', exercise: pairs });

  if (audio) {
    for (const w of pick(newWords, Math.min(2, newWords.length), rng)) {
      slides.push({ type: 'exercise', exercise: listenPick(w, sessionInput, rng, id) });
    }
  }

  // Write-it exercises for new word characters
  const newWordChars = new Set<string>();
  for (const w of newWords) for (const ch of w.characters) newWordChars.add(ch);
  const writeChars = shuffle(Array.from(newWordChars), rng).slice(0, 2);
  for (const ch of writeChars) {
    slides.push({ type: 'exercise', exercise: writeIt(ch, rng, id) });
  }

  // More MC exercises in different directions
  for (const w of pick(newWords, Math.min(2, newWords.length), rng)) {
    const dir = directions[Math.floor(rng() * directions.length)]!;
    slides.push({ type: 'exercise', exercise: multipleChoice(w, dir, sessionInput, rng, id) });
  }

  // Phase 4: Review section
  if (reviewWords.length > 0) {
    slides.push({ type: 'review-intro', wordIds: lesson.reviewWordIds });
    const reviewPool = shuffle(reviewWords, rng);
    const reviewCount = Math.min(3, Math.max(2, reviewPool.length));
    for (let i = 0; i < reviewCount; i++) {
      const w = reviewPool[i % reviewPool.length]!;
      slides.push({
        type: 'exercise',
        exercise: multipleChoice(w, directions[i % directions.length]!, sessionInput, rng, id),
      });
    }
  }

  return slides;
}
