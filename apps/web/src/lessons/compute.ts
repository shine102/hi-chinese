import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';

export interface Lesson {
  index: number;
  wordIds: string[];
  grammarIds: string[];
  sentenceIds: string[];
  reviewWordIds: string[];
}

const CHUNK_SIZE = 4;

export function lessonCount(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / CHUNK_SIZE));
}

export function computeLessons(
  unit: Unit,
  grammar: readonly GrammarPoint[],
  sentences: readonly Sentence[],
): Lesson[] {
  const total = lessonCount(unit.wordIds.length);
  const wordIndex = new Map<string, number>();
  unit.wordIds.forEach((wid, i) => wordIndex.set(wid, Math.floor(i / CHUNK_SIZE)));

  // Build word chunks
  const lessons: Lesson[] = [];
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const wordIds = unit.wordIds.slice(start, start + CHUNK_SIZE);
    const reviewWordIds = unit.wordIds.slice(0, start);
    lessons.push({ index: i, wordIds, grammarIds: [], sentenceIds: [], reviewWordIds });
  }

  // Place sentences into the lesson of their latest word
  const sentenceLesson = new Map<string, number>();
  for (const s of sentences) {
    let maxLesson = 0;
    for (const wid of s.wordIds) {
      const li = wordIndex.get(wid);
      if (li !== undefined && li > maxLesson) maxLesson = li;
    }
    sentenceLesson.set(s.id, maxLesson);
    lessons[maxLesson]!.sentenceIds.push(s.id);
  }

  // Place grammar into the lesson of their latest sentence
  for (const g of grammar) {
    let maxLesson = 0;
    for (const sid of g.sentenceIds) {
      const li = sentenceLesson.get(sid);
      if (li !== undefined && li > maxLesson) maxLesson = li;
    }
    lessons[maxLesson]!.grammarIds.push(g.id);
  }

  return lessons;
}
