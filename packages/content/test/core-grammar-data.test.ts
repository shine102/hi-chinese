import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { GrammarPoint, Sentence, Unit } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

// Core grammar added 2026-09-24 (spec 2026-09-24-core-grammar-design.md), pinned by anchor
// to these units. Guards against a future unit reshuffle silently moving or dropping them.
const CORE: Record<string, string> = {
  'g:de-possessive': 'l1-u04',
  'g:ye-dou': 'l1-u07',
  'g:ge-measure': 'l1-u09',
  'g:he-noun': 'l1-u11',
  'g:a-not-a': 'l1-u13',
  'g:le-change': 'l1-u16',
  'g:le-completed': 'l1-u18',
  'g:xiang-want': 'l1-u18',
  'g:zhe-durative': 'l1-u19',
  'g:cong-dao': 'l1-u25',
  'g:jianguo-experience-marker': 'l1-u27',
  'g:lai-qu-direction': 'l1-u28',
  'g:hui-can': 'l1-u32',
  'g:haishi-choice': 'l1-u40',
  'g:keyi-permission': 'l2-u01',
  'g:de-degree': 'l2-u01',
  'g:yi-jiu': 'l2-u05',
  'g:shi-de': 'l2-u10',
  'g:bi-extended': 'l2-u36',
  'g:jiu-cai': 'l2-u46',
};

type Chunk = { unit: Unit; grammar: GrammarPoint[]; sentences: Sentence[] };

async function loadChunks(): Promise<Chunk[]> {
  const files = (await readdir(resolve(content, 'units'))).filter((f) => f.endsWith('.json'));
  return Promise.all(files.map((f) => readJson(resolve(content, 'units', f)) as Promise<Chunk>));
}

describe('Core grammar (shipped data)', () => {
  it('places every core point in its planned unit with >= 2 in-unit examples', async () => {
    const chunks = await loadChunks();
    const problems: string[] = [];
    for (const [id, unitId] of Object.entries(CORE)) {
      const chunk = chunks.find((c) => c.unit.id === unitId);
      const g = chunk?.grammar.find((x) => x.id === id);
      if (!chunk || !g) {
        problems.push(`${id} not in ${unitId}`);
        continue;
      }
      const inUnit = new Set(chunk.sentences.map((s) => s.id));
      const n = g.sentenceIds.filter((s) => inUnit.has(s)).length;
      if (n < 2) problems.push(`${id}: ${n} in-unit examples`);
    }
    expect(problems).toEqual([]);
  });

  it('gives every L1 grammar point at least one example in its own unit', async () => {
    const chunks = await loadChunks();
    const bad = chunks
      .filter((c) => c.unit.level === 1)
      .flatMap((c) => {
        const inUnit = new Set(c.sentences.map((s) => s.id));
        return c.grammar.filter((g) => !g.sentenceIds.some((s) => inUnit.has(s))).map((g) => g.id);
      });
    expect(bad).toEqual([]);
  });

  it('gives every L2/L3 grammar point at least two examples in its own unit', async () => {
    const chunks = await loadChunks();
    const bad = chunks
      .filter((c) => c.unit.level > 1)
      .flatMap((c) => {
        const inUnit = new Set(c.sentences.map((s) => s.id));
        return c.grammar
          .filter((g) => g.sentenceIds.filter((s) => inUnit.has(s)).length < 2)
          .map((g) => `${c.unit.id}:${g.id}`);
      });
    expect(bad).toEqual([]);
  });

  it('no longer ships the L3 points that duplicated L2 core grammar', async () => {
    const ids = (await loadChunks()).flatMap((c) => c.grammar.map((g) => g.id));
    expect(ids).not.toContain('g:yi-jiu-assoonas');
    expect(ids).not.toContain('g:meiyou-comparison');
  });
});
