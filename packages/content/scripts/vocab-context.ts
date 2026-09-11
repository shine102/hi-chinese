import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { parseHskWords, type RawHskEntry } from '../src/pipeline/hsk.js';
import { assignUnits } from '../src/pipeline/units.js';
import { fetchRaw } from '../src/pipeline/fetch.js';
import type { HskLevel } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');

const levelArg = process.argv.find((a) => a.startsWith('--level='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--level') + 1];
if (!levelArg || !['1', '2', '3'].includes(levelArg)) {
  console.error('Usage: vocab-context --level <1|2|3>');
  process.exit(1);
}
const level = Number(levelArg) as HskLevel;

const raw = await fetchRaw(rawDir);
const { overrides } = await loadAuthored(authoredDir);
const entries = JSON.parse(await readFile(raw.hsk, 'utf8')) as RawHskEntry[];
const parsed = parseHskWords(entries, overrides);
const { units, words } = assignUnits(parsed);

const wordById = new Map(words.map((w) => [w.id, w]));
const cumulative: string[] = [];

for (const u of units.filter((u) => u.level === level).sort((a, b) => a.order - b.order)) {
  const newWords = u.wordIds.map((id) => wordById.get(id)!);
  for (const w of newWords) cumulative.push(w.simplified);
  console.log(`\n## ${u.id} — ${u.title}`);
  console.log(`New words (${newWords.length}):`);
  for (const w of newWords) {
    console.log(`  ${w.simplified}\t${w.pinyin}\t${w.meanings.slice(0, 2).join('; ')}`);
  }
  console.log(`Cumulative vocabulary: ${cumulative.length} words`);
  console.log(`Available: ${cumulative.join(' ')}`);
}
