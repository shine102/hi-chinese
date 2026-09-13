import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const authored = resolve(here, '../src/authored');
const content = resolve(here, '../../../apps/web/public/content');
const HAN = /\p{Script=Han}/u;

const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

async function loadMeanings(): Promise<Record<string, string[]>> {
  const merged: Record<string, string[]> = {};
  for (const level of [1, 2, 3]) {
    const m = (await readJson(resolve(authored, `meanings/level${level}.json`))) as Record<string, string[]>;
    Object.assign(merged, m);
  }
  return merged;
}

describe('Vietnamese meanings coverage', () => {
  it('covers every course word with at least one non-empty meaning', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
    const meanings = await loadMeanings();
    const missing = words
      .map((w) => w.simplified)
      .filter((s) => !meanings[s] || meanings[s].length === 0 || meanings[s].every((m) => m.trim() === ''));
    expect(missing).toEqual([]);
  });
});

describe('Vietnamese character definitions coverage', () => {
  it('covers every course character with a non-empty definition', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
    const courseChars = new Set<string>();
    for (const w of words) for (const ch of w.simplified) if (HAN.test(ch)) courseChars.add(ch);
    const defs = (await readJson(resolve(authored, 'char-definitions/base.json'))) as Record<string, string>;
    const missing = [...courseChars].filter((ch) => !defs[ch] || defs[ch].trim() === '');
    expect(missing).toEqual([]);
  });
});
