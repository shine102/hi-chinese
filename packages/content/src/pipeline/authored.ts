import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthoredGrammar, AuthoredSentence, AuthoredUnit, PinyinOverrides } from '../types.js';

export interface Authored {
  sentences: AuthoredSentence[];
  grammar: AuthoredGrammar[];
  overrides: PinyinOverrides;
  units: AuthoredUnit[];
}

async function readJsonArrays<T>(dir: string): Promise<T[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const name of names) {
    const path = join(dir, name);
    const text = await readFile(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`${path}: invalid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(parsed)) throw new Error(`${path}: expected a JSON array`);
    out.push(...(parsed as T[]));
  }
  return out;
}

export async function loadAuthored(authoredDir: string): Promise<Authored> {
  let overrides: PinyinOverrides = {};
  const overridesPath = join(authoredDir, 'pinyin-overrides.json');
  let overridesText: string | undefined;
  try {
    overridesText = await readFile(overridesPath, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  if (overridesText !== undefined) {
    try {
      overrides = JSON.parse(overridesText) as PinyinOverrides;
    } catch (e) {
      throw new Error(`${overridesPath}: invalid JSON: ${(e as Error).message}`);
    }
  }
  return {
    sentences: await readJsonArrays<AuthoredSentence>(join(authoredDir, 'sentences')),
    grammar: await readJsonArrays<AuthoredGrammar>(join(authoredDir, 'grammar')),
    overrides,
    units: await readJsonArrays<AuthoredUnit>(join(authoredDir, 'units')),
  };
}
