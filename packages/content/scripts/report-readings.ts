import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { chooseReading, hskLevelOf, mergeForms, type RawHskEntry } from '../src/pipeline/hsk.js';

const here = dirname(fileURLToPath(import.meta.url));
const entries = JSON.parse(
  await readFile(resolve(here, '../raw/complete.json'), 'utf8'),
) as RawHskEntry[];
const { overrides } = await loadAuthored(resolve(here, '../src/authored'));

console.log('word\tlevel\tchosen\toverride?\tall readings (meaning count)');
for (const entry of entries) {
  const level = hskLevelOf(entry);
  if (level === null) continue;
  const forms = mergeForms(entry.forms);
  if (forms.length < 2) continue;
  const { chosen } = chooseReading(entry, overrides);
  const all = forms.map((f) => `${f.transcriptions.numeric}(${f.meanings.length})`).join(' ');
  const flag = entry.simplified in overrides ? 'override' : '';
  console.log(`${entry.simplified}\t${level}\t${chosen.transcriptions.numeric}\t${flag}\t${all}`);
}
