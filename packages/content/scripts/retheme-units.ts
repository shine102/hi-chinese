import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unitId } from '../src/ids.js';
import {
  chunkSubthemes,
  fixCharOrder,
  isFunctionWord,
  nameUnits,
  orderUnits,
  spreadFunctionWords,
  type ThemesFile,
  type WordInfo,
} from '../src/pipeline/retheme.js';
import type { AuthoredUnit, HskLevel, Word } from '../src/types.js';

// One-off: rebuild authored L2/L3 units from authored subthemes (spec
// 2026-09-24-l2-l3-retheme-design.md §3). L1 stays as authored. Not part of the build.

// Word → 1-based unit number within its level. Tuning knob for grammar crowding.
const PINS: Record<2 | 3, Record<string, number>> = {
  2: { 可以: 1, 得: 1 },
  3: {},
};

const here = dirname(fileURLToPath(import.meta.url));
const authored = resolve(here, '../src/authored');
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const words = await readJson<Word[]>(resolve(content, 'words.json'));
const l1 = await readJson<AuthoredUnit[]>(resolve(authored, 'units/level1.json'));

const built: AuthoredUnit[][] = [];
for (const level of [2, 3] as const) {
  const levelWords = words.filter((w) => w.level === level);
  const themes = await readJson<ThemesFile>(resolve(authored, `themes/level${level}.json`));
  const contentWords = levelWords.filter((w) => !isFunctionWord(w.pos));
  const fnWords = levelWords.filter((w) => isFunctionWord(w.pos));
  const drafts = spreadFunctionWords(
    nameUnits(orderUnits(chunkSubthemes(themes, contentWords))),
    fnWords,
    PINS[level],
  );
  built.push(
    drafts.map((d, i) => ({
      id: unitId(level, i + 1),
      level,
      order: i + 1,
      title: d.title,
      words: d.words,
    })),
  );
}

const info = new Map<string, WordInfo>(words.map((w) => [w.simplified, { level: w.level, characters: w.characters }]));
const fixed = fixCharOrder([...l1, ...built[0]!, ...built[1]!], info, new Set<HskLevel>([1]));

for (const level of [2, 3] as const) {
  const units = fixed.filter((u) => u.level === level);
  const empty = units.filter((u) => u.words.length === 0).map((u) => u.id);
  if (empty.length > 0) throw new Error(`empty units after char-order fix: ${empty.join(', ')}`);
  await writeFile(resolve(authored, `units/level${level}.json`), `${JSON.stringify(units, null, 2)}\n`);
  const sizes = units.map((u) => u.words.length);
  const fnCount = units.map((u) => u.words.filter((w) => isFunctionWord(words.find((x) => x.simplified === w)!.pos)).length);
  const suffixed = units.filter((u) => / \d+$/.test(u.title)).length;
  console.log(
    `L${level}: ${units.length} units, words/unit ${Math.min(...sizes)}-${Math.max(...sizes)}, ` +
      `function words/unit ${Math.min(...fnCount)}-${Math.max(...fnCount)}, numbered titles ${suffixed}`,
  );
}
