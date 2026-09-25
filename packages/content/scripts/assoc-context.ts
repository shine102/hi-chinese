import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { cvdictCandidates, singleCharWordsInOrder } from '../src/pipeline/assoc-context.js';
import { alignSyllables, indexCedict, tonelessSyllables } from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import { CVDICT_SOURCE, fetchRaw } from '../src/pipeline/fetch.js';
import { formatGloss } from '../src/pipeline/glosses.js';
import type { CharacterData, HskLevel, UnitChunk, Word } from '../src/types.js';

// Authoring aid for associations / glosses / meaning order. Prints context per item; writes nothing.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const from = Number(arg('from') ?? 0);
const to = Number(arg('to') ?? Number.MAX_SAFE_INTEGER);

const words = JSON.parse(await readFile(resolve(content, 'words.json'), 'utf8')) as Word[];
const chunks: UnitChunk[] = [];
for (const f of (await readdir(resolve(content, 'units'))).filter((n) => n.endsWith('.json'))) {
  chunks.push(JSON.parse(await readFile(resolve(content, 'units', f), 'utf8')) as UnitChunk);
}
const units = chunks.map((c) => c.unit);
const unitOrder = new Map(units.map((u) => [u.id, u.order]));
const sentences = chunks.flatMap((c) => c.sentences);
const authored = await loadAuthored(resolve(here, '../src/authored'));
const raw = await fetchRaw(resolve(here, '../raw'), undefined, () => {}, { cvdict: CVDICT_SOURCE });
const cvdict = indexCedict(parseCedict(await readFile(raw.cvdict!, 'utf8')));
const courseSet = new Set(words.map((w) => w.simplified));
const readChar = async (ch: string) =>
  JSON.parse(
    await readFile(resolve(content, 'characters', `${ch.codePointAt(0)!.toString(16)}.json`), 'utf8'),
  ) as CharacterData;

/** Course words containing `ch`, with the syllable `ch` has in each. */
function courseWordsWith(ch: string): string[] {
  return words
    .filter((w) => w.simplified !== ch && w.simplified.includes(ch))
    .sort((a, b) => (unitOrder.get(a.unitId) ?? 0) - (unitOrder.get(b.unitId) ?? 0))
    .map((w) => {
      const syl = alignSyllables(w.simplified, w.pinyin)?.find((p) => p.char === ch)?.syllable ?? '?';
      return `${w.simplified} ${w.pinyin} [${syl}] (${w.unitId}) ${w.hanViet} — ${w.meanings[0]}`;
    });
}

if (process.argv.includes('--glosses')) {
  const single = new Set(words.filter((w) => [...w.simplified].length === 1).map((w) => w.simplified));
  const firstUnit = new Map<string, number>();
  for (const w of words)
    for (const ch of w.characters)
      firstUnit.set(ch, Math.min(firstUnit.get(ch) ?? Infinity, unitOrder.get(w.unitId) ?? Infinity));
  const chars = [...firstUnit.keys()].filter((c) => !single.has(c)).sort((a, b) => firstUnit.get(a)! - firstUnit.get(b)!);
  console.log(`characters that are not single-character course words: ${chars.length}`);
  for (const [i, ch] of chars.entries()) {
    if (i < from || i > to) continue;
    const c = await readChar(ch);
    console.log(`\n[${i}] ${ch} · ${c.hanViet} · readings ${c.pinyin.join(', ')}`);
    console.log(`  gloss now: ${formatGloss(authored.charGlosses[ch]) || '—'}`);
    console.log(`  definition: ${c.definition ?? '—'}`);
    for (const line of courseWordsWith(ch)) console.log(`  course: ${line}`);
  }
} else {
  const level = Number(arg('level')) as HskLevel;
  if (![1, 2, 3].includes(level)) {
    console.error('Usage: assoc-context --level <1|2|3> [--from i] [--to j] | --glosses [--from i] [--to j]');
    process.exit(1);
  }
  const list = singleCharWordsInOrder(words, units, level);
  console.log(`level ${level}: ${list.length} single-character words`);
  for (const [i, w] of list.entries()) {
    if (i < from || i > to) continue;
    const taught = tonelessSyllables(w.pinyin)[0]!;
    const c = await readChar(w.simplified);
    const current = authored.associations[w.simplified];
    console.log(`\n[${i}] ${w.simplified} ${w.pinyin} · ${w.hanViet} · ${w.unitId} · pos ${w.pos.join(',')}`);
    console.log(`  meanings now: ${w.meanings.join(' | ')}`);
    console.log(`  gloss now: ${formatGloss(authored.charGlosses[w.simplified]) || '—'} · char definition: ${c.definition ?? '—'}`);
    console.log(`  associations now: ${current === undefined ? '—' : JSON.stringify(current)}`);
    for (const s of sentences.filter((s) => s.wordIds.includes(w.id)).slice(0, 4))
      console.log(`  sentence: ${s.zh} ${s.pinyin} — ${s.vi}`);
    for (const line of courseWordsWith(w.simplified)) console.log(`  course: ${line}`);
    for (const cand of cvdictCandidates(w.simplified, taught, cvdict, courseSet))
      console.log(`  cvdict${cand.inCourse ? ' (course)' : ''}: ${cand.zh} ${cand.pinyin} — ${cand.vi}`);
  }
}
