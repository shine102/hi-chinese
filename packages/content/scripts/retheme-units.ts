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

// Word → 1-based unit NUMBER within its level (not a subtheme), a tuning knob for the
// 18-word cap and grammar crowding. Re-check every pin after any themes change or reorder:
// the same number then points at a different unit.
const PINS: Record<2 | 3, Record<string, number>> = {
  2: {
    可以: 1, // keeps g:keyi-permission in l2-u01 (core grammar)
    得: 1, // keeps g:de-degree in l2-u01 (core grammar)
    只要: 26, // crowding: out of u22 (7 points); u26 holds none
    虽然: 28, // crowding: out of u22 (7 points); u28 holds none
    特别: 21, // crowding: out of u22; u21 holds one
    带来: 39, // anchor of core g:shi-de: out of the last unit (u59 Suy Nghĩ); u39 Du Lịch: Đi Chơi & Tham Quan
  },
  3: {
    把: 4, // crowding: the four 把 points and 被 overfill l3-u01; u04 holds none
    为了: 23, // crowding: g:weile-purpose out of l3-u04 (the 把 unit); u23 holds none
    被: 13, // crowding: 被 (with its 弄坏/拉开 examples) out of l3-u01; u13 holds none
  },
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
  const { tiers } = await readJson<ThemesFile>(resolve(authored, `themes/level${level}.json`));
  const tierOf = (u: AuthoredUnit) => tiers[u.title.split(': ')[0]!];
  const quarter = Math.ceil(units.length / 4);
  const meanPos = (t: number) => {
    const idx = units.flatMap((u, i) => (tierOf(u) === t ? [i + 1] : []));
    return (idx.reduce((a, b) => a + b, 0) / idx.length).toFixed(1);
  };
  console.log(
    `  tier 3 units in first ${quarter}: ${units.slice(0, quarter).filter((u) => tierOf(u) === 3).length}; ` +
      `mean position tier 1/2/3: ${meanPos(1)}/${meanPos(2)}/${meanPos(3)}`,
  );
}
