import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { writeContent } from '../src/pipeline/build.js';
import { fetchRaw } from '../src/pipeline/fetch.js';
import { assembleContent } from '../src/pipeline/run.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');
const outDir = process.env['CONTENT_OUT'] ?? resolve(here, '../../../apps/web/public/content');

const t0 = Date.now();
const raw = await fetchRaw(rawDir);
const authored = await loadAuthored(authoredDir);

const result = assembleContent({
  hskJson: await readFile(raw.hsk, 'utf8'),
  dictionaryText: await readFile(raw.dictionary, 'utf8'),
  graphicsText: await readFile(raw.graphics, 'utf8'),
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
