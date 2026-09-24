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
    条件: 13, // 18-word cap: out of u01 (drags 条/件 in); u13 Suy Nghĩ: Tìm Cách Giải Quyết
    取得: 49, // 18-word cap: out of u01 (drags 取 in); u49 Trường Học: Thi Cử & Trình Độ
    那样: 15, // 18-word cap: out of u10; u15 Suy Nghĩ: Giống Nhau & Bình Thường
  },
  3: {
    把: 3, // crowding: 把 and 被 points together overfill l3-u01; the 把 points go to u03
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
