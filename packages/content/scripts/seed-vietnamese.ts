import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeCedictPinyin,
  parseCedict,
  pinyinToNumeric,
  type CedictEntry,
} from '../src/pipeline/cedict.js';
import { CVDICT_SOURCE, fetchRaw } from '../src/pipeline/fetch.js';

// One-off seed script (Phase P2): downloads CVDICT (a Vietnamese CC-CEDICT-style
// dictionary), matches every course word/character to a Vietnamese meaning, and
// writes the results into src/authored/meanings and src/authored/char-definitions.
// Its output is committed as authored source data; the regular content build never
// touches CVDICT again.

export interface WordMatchResult {
  meanings: string[] | null;
  ambiguous: boolean;
}

export interface CharMatchResult {
  definition: string | null;
  ambiguous: boolean;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

// CVDICT (like CC-CEDICT) carries cross-reference/variant "stub" entries
// alongside the real definition for the same Han character, and sometimes
// several such stubs share the EXACT SAME pinyin as each other (and as the
// course's pinyin) — e.g. for 只[zhi3]: the real entry "chỉ/chỉ đơn thuần/..."
// plus two duplicate "biến thể của 只[zhi3]" cross-reference stubs. Naively
// taking the first pinyin-matching entry can pick a stub over the real
// definition. isWeakMeaningVi flags meanings that are pure cross-references
// (variant-of, surname-reading markers, "see X") rather than real content.
// Note: JS regex `\b` only recognizes ASCII word characters, so it does not
// work as a boundary after Vietnamese diacritics (e.g. "thể", "là") — use
// explicit trailing spaces/brackets instead.
const WEAK_MEANING_VI =
  /^(biến thể |dạng biến thể |cũng (viết|đọc) là|xem |họ \[)|\(họ\)$/i;

function isWeakMeaning(meaning: string): boolean {
  return WEAK_MEANING_VI.test(meaning.trim());
}

function hasRealContent(entry: CedictEntry): boolean {
  return entry.meanings.some((m) => !isWeakMeaning(m));
}

// Among a group of CEDICT entries that tie on the pinyin we're matching
// against, prefer entries with at least one non-weak (real) meaning over
// pure cross-reference/variant stubs. If exactly one entry has real content,
// use it directly (not ambiguous — the "duplicate" was just dictionary noise).
// If more than one has real content, concatenate them and flag ambiguous
// (same as the cross-pinyin heteronym case). Only fall back to weak-only
// stubs if literally nothing else is available for that pinyin.
function resolveTied(candidates: CedictEntry[]): { meanings: string[]; ambiguous: boolean } {
  const real = candidates.filter(hasRealContent);
  const pool = real.length > 0 ? real : candidates;
  if (pool.length === 1) return { meanings: pool[0]!.meanings, ambiguous: false };
  return { meanings: dedupe(pool.flatMap((e) => e.meanings)), ambiguous: true };
}

export function matchWordMeanings(
  word: { simplified: string; pinyinNumeric: string },
  cedictBySimplified: Map<string, CedictEntry[]>,
): WordMatchResult {
  const entries = cedictBySimplified.get(word.simplified);
  if (!entries || entries.length === 0) return { meanings: null, ambiguous: false };
  if (entries.length === 1) return { meanings: entries[0]!.meanings, ambiguous: false };

  const target = entries.filter((e) => normalizeCedictPinyin(e.pinyin) === word.pinyinNumeric);
  if (target.length > 0) {
    const r = resolveTied(target);
    return { meanings: r.meanings, ambiguous: r.ambiguous };
  }

  // No entry shares the course's exact pinyin reading: concatenate everything
  // (preferring real content over pure stubs) and always flag for review.
  const r = resolveTied(entries);
  return { meanings: r.meanings, ambiguous: true };
}

export function matchCharDefinition(
  char: { character: string; pinyin: string[] },
  cedictBySimplified: Map<string, CedictEntry[]>,
): CharMatchResult {
  const entries = cedictBySimplified.get(char.character);
  if (!entries || entries.length === 0) return { definition: null, ambiguous: false };
  if (entries.length === 1) {
    return { definition: entries[0]!.meanings.join(', '), ambiguous: false };
  }

  const charNumericReadings = char.pinyin.map((p) => pinyinToNumeric(p));
  const target = entries.filter((e) =>
    charNumericReadings.includes(normalizeCedictPinyin(e.pinyin)),
  );
  if (target.length > 0) {
    const r = resolveTied(target);
    return { definition: r.meanings.join(', '), ambiguous: r.ambiguous };
  }

  const r = resolveTied(entries);
  return { definition: r.meanings.join(', '), ambiguous: true };
}

interface CourseWord {
  simplified: string;
  pinyinNumeric: string;
  level: 1 | 2 | 3;
}

interface CourseChar {
  character: string;
  pinyin: string[];
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const rawDir = resolve(here, '../raw');
  const authoredDir = resolve(here, '../src/authored');
  const contentDir = resolve(here, '../../../apps/web/public/content');

  const raw = await fetchRaw(rawDir, undefined, undefined, { cvdict: CVDICT_SOURCE });
  const cvdictText = await readFile(raw.cvdict!, 'utf8');
  const entries = parseCedict(cvdictText);

  const cedictBySimplified = new Map<string, CedictEntry[]>();
  for (const e of entries) {
    const list = cedictBySimplified.get(e.simplified);
    if (list) list.push(e);
    else cedictBySimplified.set(e.simplified, [e]);
  }

  const words = JSON.parse(
    await readFile(join(contentDir, 'words.json'), 'utf8'),
  ) as CourseWord[];

  const meaningsByLevel: Record<1 | 2 | 3, Record<string, string[]>> = { 1: {}, 2: {}, 3: {} };
  const missingWords: string[] = [];
  const ambiguousWords: string[] = [];

  for (const w of words) {
    const r = matchWordMeanings(w, cedictBySimplified);
    if (r.meanings === null) {
      missingWords.push(w.simplified);
      continue;
    }
    if (r.ambiguous) ambiguousWords.push(w.simplified);
    meaningsByLevel[w.level][w.simplified] = r.meanings;
  }

  const charFiles = (await readdir(join(contentDir, 'characters'))).filter((n) =>
    n.endsWith('.json'),
  );

  const charDefinitions: Record<string, string> = {};
  const missingChars: string[] = [];
  const ambiguousChars: string[] = [];

  for (const name of charFiles) {
    const c = JSON.parse(
      await readFile(join(contentDir, 'characters', name), 'utf8'),
    ) as CourseChar;
    const r = matchCharDefinition(c, cedictBySimplified);
    if (r.definition === null) {
      missingChars.push(c.character);
      continue;
    }
    if (r.ambiguous) ambiguousChars.push(c.character);
    charDefinitions[c.character] = r.definition;
  }

  const meaningsOut = join(authoredDir, 'meanings');
  const charDefsOut = join(authoredDir, 'char-definitions');
  await mkdir(meaningsOut, { recursive: true });
  await mkdir(charDefsOut, { recursive: true });

  const write = (p: string, v: unknown) => writeFile(p, `${JSON.stringify(v, null, 2)}\n`, 'utf8');
  await write(join(meaningsOut, 'level1.json'), meaningsByLevel[1]);
  await write(join(meaningsOut, 'level2.json'), meaningsByLevel[2]);
  await write(join(meaningsOut, 'level3.json'), meaningsByLevel[3]);
  await write(join(charDefsOut, 'base.json'), charDefinitions);

  console.log(
    `words: level1=${Object.keys(meaningsByLevel[1]).length} level2=${Object.keys(meaningsByLevel[2]).length} level3=${Object.keys(meaningsByLevel[3]).length}`,
  );
  console.log(`characters: matched=${Object.keys(charDefinitions).length}`);
  console.log('');
  console.log(`missing words (${missingWords.length}): ${JSON.stringify(missingWords)}`);
  console.log(`ambiguous words (${ambiguousWords.length}): ${JSON.stringify(ambiguousWords)}`);
  console.log(`missing characters (${missingChars.length}): ${JSON.stringify(missingChars)}`);
  console.log(`ambiguous characters (${ambiguousChars.length}): ${JSON.stringify(ambiguousChars)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
