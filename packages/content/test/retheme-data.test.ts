import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findCrowdedUnits, MAX_GRAMMAR_PER_UNIT } from '../src/pipeline/grammar-crowding.js';
import type { ThemesFile } from '../src/pipeline/retheme.js';
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

  it('put concrete units first and abstract ones later', async () => {
    const units = await loadLevel(level);
    const themes = await readJson<ThemesFile>(resolve(here, '../src/authored/themes', `level${level}.json`));
    const tierOf = (u: Unit) => themes.tiers[broad(u)];
    expect(units.filter((u) => tierOf(u) === undefined).map((u) => u.id)).toEqual([]);
    const mean = (t: number) => {
      const idx = units.flatMap((u, i) => (tierOf(u) === t ? [i] : []));
      return idx.reduce((a, b) => a + b, 0) / idx.length;
    };
    expect(mean(1)).toBeLessThan(mean(2));
    expect(mean(2)).toBeLessThan(mean(3));
    const q = Math.ceil(units.length / 4);
    expect(units.slice(0, q).filter((u) => tierOf(u) === 3).length).toBeLessThanOrEqual(Math.floor(0.15 * q));
    const half = Math.ceil(units.length / 2);
    const lateTier1 = Object.entries(themes.tiers)
      .filter(([, t]) => t === 1)
      .map(([b]) => b)
      .filter((b) => units.findIndex((u) => broad(u) === b) >= half);
    expect(lateTier1).toEqual([]);
  });

  it('keep every unit at 18 words or fewer', async () => {
    const units = await loadLevel(level);
    expect(
      units.filter((u) => u.wordIds.length > 18).map((u) => `${u.id}:${u.wordIds.length}`),
    ).toEqual([]);
  });
});

describe('shipped L1 units', () => {
  it(`hold at most ${MAX_GRAMMAR_PER_UNIT} grammar points per unit`, async () => {
    expect(findCrowdedUnits(await loadLevel(1))).toEqual([]);
  });
});
