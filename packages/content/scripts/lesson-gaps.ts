import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSON_SIZE, lessonSentenceCounts } from '../src/pipeline/lesson-gaps.js';
import type { Sentence, Unit, Word } from '../src/types.js';

// Lists lessons with no sentence in the built content, with each lesson's words
// and the vocabulary a new sentence may use. Authoring aid; not part of the build.

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const usage = 'Usage: lesson-gaps --level <1|2|3> [--from <unitId>] [--to <unitId>]';

const level = Number(arg('level'));
if (![1, 2, 3].includes(level)) {
  console.error(usage);
  process.exit(1);
}

const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
  resolve(content, 'manifest.json'),
);
const words = await readJson<Word[]>(resolve(content, 'words.json'));
const wordById = new Map(words.map((w) => [w.id, w]));
const levels = [...manifest.levels].sort((a, b) => a.level - b.level);
const allUnitIds = levels.flatMap((l) => l.unitIds);
const levelUnitIds = levels.find((l) => l.level === level)!.unitIds;

const from = arg('from') ?? levelUnitIds[0]!;
const to = arg('to') ?? levelUnitIds[levelUnitIds.length - 1]!;
const start = levelUnitIds.indexOf(from);
const end = levelUnitIds.indexOf(to);
if (start < 0 || end < start) {
  console.error(`${usage}\n--from/--to must be unit ids of level ${level}, in order.`);
  process.exit(1);
}
const scope = levelUnitIds.slice(start, end + 1);

const readChunk = (uid: string) =>
  readJson<{ unit: Unit; sentences: Sentence[] }>(resolve(content, 'units', `${uid}.json`));
const zh = (wid: string) => wordById.get(wid)?.simplified ?? wid;

const before: string[] = [];
for (const uid of allUnitIds.slice(0, allUnitIds.indexOf(scope[0]!))) {
  before.push(...(await readChunk(uid)).unit.wordIds.map(zh));
}
console.log(`# Vocabulary before ${scope[0]} (${before.length} words)`);
console.log(before.join(' '));
console.log('\nA sentence for lesson k may also use the words of lessons 0..k of its unit.');

let empty = 0;
for (const uid of scope) {
  const { unit, sentences } = await readChunk(uid);
  const counts = lessonSentenceCounts(unit.wordIds, sentences);
  console.log(`\n## ${unit.id} — ${unit.title}`);
  counts.forEach((count, li) => {
    if (count === 0) empty++;
    console.log(`Lesson ${li} (${count} sentences)${count === 0 ? '  [EMPTY]' : ''}`);
    for (const wid of unit.wordIds.slice(li * LESSON_SIZE, (li + 1) * LESSON_SIZE)) {
      const w = wordById.get(wid);
      console.log(w ? `  ${w.simplified}\t${w.pinyin}\t${w.meanings.slice(0, 2).join('; ')}` : `  ${wid}`);
    }
  });
}
console.log(`\nEmpty lessons in scope (${scope[0]}..${scope[scope.length - 1]}): ${empty}`);
