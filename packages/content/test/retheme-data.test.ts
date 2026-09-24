import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findCrowdedUnits, MAX_GRAMMAR_PER_UNIT } from '../src/pipeline/grammar-crowding.js';
import type { Unit } from '../src/types.js';

// Spec 2026-09-24-l2-l3-retheme-design.md §5: shipped L2/L3 units alternate broad themes,
// have unique titles, and hold at most MAX_GRAMMAR_PER_UNIT grammar points.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const loadLevel = async (level: number): Promise<Unit[]> => {
  const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
    resolve(content, 'manifest.json'),
  );
  const ids = manifest.levels.find((l) => l.level === level)!.unitIds;
  const units: Unit[] = [];
  for (const id of ids)
    units.push((await readJson<{ unit: Unit }>(resolve(content, 'units', `${id}.json`))).unit);
  return units;
};
const broad = (u: Unit) => u.title.split(': ')[0]!;

describe.each([2, 3])('shipped L%i units', (level) => {
  it('never put two units of the same broad theme side by side', async () => {
    const units = await loadLevel(level);
    const adjacent = units
      .slice(1)
      .filter((u, i) => broad(u) === broad(units[i]!))
      .map((u) => u.id);
    expect(adjacent).toEqual([]);
  });

  it('have unique "<broad>: <subtopic>" titles', async () => {
    const units = await loadLevel(level);
    expect(units.every((u) => u.title.includes(': '))).toBe(true);
    expect(new Set(units.map((u) => u.title)).size).toBe(units.length);
  });

  it(`hold at most ${MAX_GRAMMAR_PER_UNIT} grammar points per unit`, async () => {
    const units = await loadLevel(level);
    expect(findCrowdedUnits(units)).toEqual([]);
  });

  it('keep every unit at 18 words or fewer', async () => {
    const units = await loadLevel(level);
    expect(
      units.filter((u) => u.wordIds.length > 18).map((u) => `${u.id}:${u.wordIds.length}`),
    ).toEqual([]);
  });
});
