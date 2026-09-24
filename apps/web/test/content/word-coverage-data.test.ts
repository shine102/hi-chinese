import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Sentence, Unit, Word } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { LEVELS_DONE } from './levels-done.js';

// Spec 2026-09-24-sentence-expansion-design.md: every word of a finished level is
// in some sentence, or in the allowlist with a reason. Reads the shipped content.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../public/content');
const allowPath = resolve(here, '../../../../packages/content/src/authored/uncovered-words.json');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const load = async () => {
  const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
    resolve(content, 'manifest.json'),
  );
  const words = await readJson<Word[]>(resolve(content, 'words.json'));
  const allow = await readJson<Record<string, string>>(allowPath);
  const units = new Map<string, { unit: Unit; sentences: Sentence[] }>();
  for (const uid of manifest.levels.flatMap((l) => l.unitIds))
    units.set(uid, await readJson(resolve(content, 'units', `${uid}.json`)));
  const used = new Set([...units.values()].flatMap((c) => c.sentences.flatMap((s) => s.wordIds)));
  return { manifest, words, allow, units, used };
};

describe('shipped content word coverage', () => {
  it('puts every word of a finished level in a sentence or the allowlist', async () => {
    const { manifest, words, allow, units, used } = await load();
    const zh = new Map(words.map((w) => [w.id, w.simplified]));
    const missing = manifest.levels
      .filter((l) => LEVELS_DONE.includes(l.level))
      .flatMap((l) => l.unitIds.flatMap((uid) => units.get(uid)!.unit.wordIds))
      .filter((wid) => !used.has(wid) && allow[zh.get(wid)!] === undefined)
      .map((wid) => zh.get(wid) ?? wid);
    expect(missing).toEqual([]);
  });

  it('keeps the allowlist small, reasoned and limited to uncovered course words', async () => {
    const { words, allow, used } = await load();
    const bySimplified = new Map(words.map((w) => [w.simplified, w]));
    const entries = Object.entries(allow);
    expect(entries.filter(([zh]) => !bySimplified.has(zh)).map(([zh]) => zh)).toEqual([]);
    expect(
      entries.filter(([zh]) => used.has(bySimplified.get(zh)?.id ?? '')).map(([zh]) => zh),
    ).toEqual([]);
    expect(entries.filter(([, why]) => why.trim() === '').map(([zh]) => zh)).toEqual([]);
    expect(entries.length).toBeLessThan(Math.floor(0.02 * words.length));
  });
});
