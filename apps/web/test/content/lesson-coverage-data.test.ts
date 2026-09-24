import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeLessons } from '../../src/lessons/compute.js';

// Spec 2026-09-24-lesson-sentence-coverage-design.md: every lesson has a sentence,
// so every lesson gets a sentence-builder exercise. Reads the shipped content.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

describe('shipped content lesson coverage', () => {
  it('gives every lesson of every unit at least one sentence', async () => {
    const manifest = await readJson<{ levels: { unitIds: string[] }[] }>(
      resolve(content, 'manifest.json'),
    );
    const unitIds = manifest.levels.flatMap((l) => l.unitIds);
    const empty: string[] = [];
    for (const uid of unitIds) {
      const chunk = await readJson<{ unit: Unit; grammar: GrammarPoint[]; sentences: Sentence[] }>(
        resolve(content, 'units', `${uid}.json`),
      );
      for (const lesson of computeLessons(chunk.unit, chunk.grammar, chunk.sentences)) {
        if (lesson.sentenceIds.length === 0) empty.push(`${uid}#${lesson.index}`);
      }
    }
    expect(unitIds.length).toBeGreaterThan(100);
    expect(empty).toEqual([]);
  });
});
