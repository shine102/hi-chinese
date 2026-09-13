import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findOrderViolations } from '../src/pipeline/curriculum-order.js';
import type { Unit, Word } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');

const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

// Regression guard: P3 re-curated level 1 and P4/P5 re-curated levels 2/3 so every
// single-character word is taught at or before any compound built from it — with one
// principled exception baked into findOrderViolations itself: a constituent character whose
// own HSK level is HIGHER than the compound's level is not a curation defect (HSK itself made
// that character harder than the compound, e.g. 名字 is HSK1 but 名 is only an HSK2 headword),
// so those don't count as violations at all. This checks the shipped data directly, across
// every level, so a future hand-edit to any units/levelN.json that reintroduces a real
// compound-before-its-character ordering fails here rather than shipping silently.
describe('Curriculum word order (all levels)', () => {
  it('has no compound taught at or before its own constituent character', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as Word[];
    const unitFiles = (await readdir(resolve(content, 'units'))).filter((f) => f.endsWith('.json'));
    const units: Unit[] = [];
    for (const f of unitFiles) {
      const chunk = (await readJson(resolve(content, 'units', f))) as { unit: Unit };
      units.push(chunk.unit);
    }

    const violations = findOrderViolations({ words, units });
    expect(violations).toEqual([]);
  });
});
