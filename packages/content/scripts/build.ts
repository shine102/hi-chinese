import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { writeContent } from '../src/pipeline/build.js';
import { buildCharacters } from '../src/pipeline/characters.js';
import { fetchRaw } from '../src/pipeline/fetch.js';
import { parseHskWords, type RawHskEntry } from '../src/pipeline/hsk.js';
import { attachToUnits, placeGrammar, placeSentences } from '../src/pipeline/placement.js';
import { assignUnits } from '../src/pipeline/units.js';
import { validateContent } from '../src/pipeline/validate.js';
import type { ContentBundle } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');
const outDir = process.env['CONTENT_OUT'] ?? resolve(here, '../../../apps/web/public/content');

const t0 = Date.now();
const raw = await fetchRaw(rawDir);
const authored = await loadAuthored(authoredDir);

const entries = JSON.parse(await readFile(raw.hsk, 'utf8')) as RawHskEntry[];
const parsed = parseHskWords(entries, authored.overrides);
const { units: bareUnits, words } = assignUnits(parsed);

const { sentences, errors: sentenceErrors } = placeSentences(authored.sentences, words, bareUnits);
const { grammar, errors: grammarErrors } = placeGrammar(authored.grammar, sentences, bareUnits);
const units = attachToUnits(bareUnits, sentences, grammar);

const { characters, missing } = buildCharacters(
  await readFile(raw.dictionary, 'utf8'),
  await readFile(raw.graphics, 'utf8'),
  words,
);

const bundle: ContentBundle = { words, characters, units, grammar, sentences };
const problems = [
  ...sentenceErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
  ...grammarErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
  ...missing.map((ch) => `[characters] no stroke data for ${ch}`),
  ...validateContent(bundle).map((e) => `[${e.rule}] ${e.message}`),
];
if (problems.length > 0) {
  console.error(`content build failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const manifest = await writeContent(bundle, outDir);
console.log(
  `content ${manifest.version} written to ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
console.log(manifest.counts);
for (const level of manifest.levels) console.log(`  ${level.title}: ${level.unitIds.length} units`);
