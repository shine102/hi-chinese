import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findOrderViolations } from '../src/pipeline/curriculum-order.js';
import type { Unit, Word } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');

const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

// Regression guard: P3 re-curated level 1 so single-character words are taught at or before
// any compound built from them (docs/superpowers/plans/2026-09-13-p3-l1-word-order.md). This
// checks the shipped data directly so a future hand-edit to units/level1.json that
// reintroduces a compound-before-its-character ordering fails here rather than shipping
// silently. L2/L3 are not yet curated this way (P4/P5) and are intentionally excluded.
describe('Curriculum word order (level 1)', () => {
  it('has no compound taught at or before its own constituent character', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as Word[];
    const unitFiles = (await readdir(resolve(content, 'units'))).filter(
      (f) => f.startsWith('l1-') && f.endsWith('.json'),
    );
    const units: Unit[] = [];
    for (const f of unitFiles) {
      const chunk = (await readJson(resolve(content, 'units', f))) as { unit: Unit };
      units.push(chunk.unit);
    }
    const l1WordIds = new Set(units.flatMap((u) => u.wordIds));
    const l1Words = words.filter((w) => l1WordIds.has(w.id));

    const violations = findOrderViolations({ words: l1Words, units });
    expect(violations).toEqual([]);
  });
});
