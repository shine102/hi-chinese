// Mirrors CHUNK_SIZE and sentence placement in apps/web/src/lessons/compute.ts.
// Authoring tool only; the web data guard runs the real computeLessons.
export const LESSON_SIZE = 4;

export function lessonSentenceCounts(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
): number[] {
  const total = Math.max(1, Math.ceil(wordIds.length / LESSON_SIZE));
  const lessonOf = new Map(wordIds.map((w, i) => [w, Math.floor(i / LESSON_SIZE)] as const));
  const counts = Array<number>(total).fill(0);
  for (const s of sentences) {
    let latest = 0;
    for (const w of s.wordIds) {
      const li = lessonOf.get(w);
      if (li !== undefined && li > latest) latest = li;
    }
    counts[latest]!++;
  }
  return counts;
}
