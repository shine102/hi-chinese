import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { writeContent } from '../src/pipeline/build.js';
import { CVDICT_SOURCE, fetchRaw } from '../src/pipeline/fetch.js';
import { findOrderViolations } from '../src/pipeline/curriculum-order.js';
import { findCrowdedUnits, MAX_GRAMMAR_PER_UNIT } from '../src/pipeline/grammar-crowding.js';
import { assembleContent } from '../src/pipeline/run.js';
import { findEnglishFallbacks } from '../src/pipeline/vietnamese-coverage.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');
const outDir = process.env['CONTENT_OUT'] ?? resolve(here, '../../../apps/web/public/content');

const t0 = Date.now();
const raw = await fetchRaw(rawDir);
const rawCvdict = await fetchRaw(rawDir, undefined, undefined, { cvdict: CVDICT_SOURCE });
const authored = await loadAuthored(authoredDir);

const result = assembleContent({
  hskJson: await readFile(raw.hsk, 'utf8'),
  dictionaryText: await readFile(raw.dictionary, 'utf8'),
  graphicsText: await readFile(raw.graphics, 'utf8'),
  cvdictText: await readFile(rawCvdict.cvdict!, 'utf8'),
  authored,
});

if (!result.ok) {
  console.error(`content build failed with ${result.problems.length} problem(s):`);
  for (const p of result.problems) console.error(`  ${p}`);
  process.exit(1);
}

const manifest = await writeContent(result.bundle, outDir);
console.log(
  `content ${manifest.version} written to ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
console.log(manifest.counts);
for (const level of manifest.levels) console.log(`  ${level.title}: ${level.unitIds.length} units`);

const coverage = findEnglishFallbacks(result.bundle, authored.meanings, authored.charDefinitions);
if (coverage.wordsOnEnglishFallback.length > 0 || coverage.charactersOnEnglishFallback.length > 0) {
  console.warn('warning: Vietnamese content coverage gaps (English fallback still in use):');
  if (coverage.wordsOnEnglishFallback.length > 0) {
    console.warn(`  words: ${coverage.wordsOnEnglishFallback.join(', ')}`);
  }
  if (coverage.charactersOnEnglishFallback.length > 0) {
    console.warn(`  characters: ${coverage.charactersOnEnglishFallback.join(', ')}`);
  }
}

const orderViolations = findOrderViolations(result.bundle);
if (orderViolations.length > 0) {
  console.warn(
    `warning: ${orderViolations.length} curriculum-order issue(s) (compound taught at/before its own character):`,
  );
  for (const v of orderViolations) {
    console.warn(`  ${v.word} (${v.unitId}) uses ${v.char} (${v.charUnitId})`);
  }
}

const crowded = findCrowdedUnits(result.bundle.units);
if (crowded.length > 0) {
  console.warn(
    `warning: ${crowded.length} unit(s) with more than ${MAX_GRAMMAR_PER_UNIT} grammar points:`,
  );
  for (const c of crowded) console.warn(`  ${c.unitId}: ${c.count}`);
}
