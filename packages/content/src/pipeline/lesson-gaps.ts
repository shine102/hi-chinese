// Mirrors CHUNK_SIZE and sentence placement in apps/web/src/lessons/compute.ts.
// Authoring tool only; the web data guards run the real computeLessons.
export const LESSON_SIZE = 4;

// Sentences per lesson, counting only sentences with at least minWords words.
export function lessonSentenceCounts(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
  minWords = 1,
): number[] {
  const total = Math.max(1, Math.ceil(wordIds.length / LESSON_SIZE));
  const lessonOf = new Map(wordIds.map((w, i) => [w, Math.floor(i / LESSON_SIZE)] as const));
  const counts = Array<number>(total).fill(0);
  for (const s of sentences) {
    if (s.wordIds.length < minWords) continue;
    let latest = 0;
    for (const w of s.wordIds) {
      const li = lessonOf.get(w);
      if (li !== undefined && li > latest) latest = li;
    }
    counts[latest]!++;
  }
  return counts;
}

// Words of wordIds that no sentence uses.
export function uncoveredWords(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
): string[] {
  const used = new Set(sentences.flatMap((s) => s.wordIds));
  return wordIds.filter((w) => !used.has(w));
}
