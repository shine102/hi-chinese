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

export function matchWordMeanings(
  word: { simplified: string; pinyinNumeric: string },
  cedictBySimplified: Map<string, CedictEntry[]>,
): WordMatchResult {
  const entries = cedictBySimplified.get(word.simplified);
  if (!entries || entries.length === 0) return { meanings: null, ambiguous: false };
  if (entries.length === 1) return { meanings: entries[0]!.meanings, ambiguous: false };

  const exact = entries.find(
    (e) => normalizeCedictPinyin(e.pinyin) === word.pinyinNumeric,
  );
  if (exact) return { meanings: exact.meanings, ambiguous: false };

  const meanings = dedupe(entries.flatMap((e) => e.meanings));
  return { meanings, ambiguous: true };
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
  const exact = entries.find((e) =>
    charNumericReadings.includes(normalizeCedictPinyin(e.pinyin)),
  );
  if (exact) return { definition: exact.meanings.join(', '), ambiguous: false };

  const meanings = dedupe(entries.flatMap((e) => e.meanings));
  return { definition: meanings.join(', '), ambiguous: true };
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
