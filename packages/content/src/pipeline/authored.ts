import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthoredGrammar, AuthoredSentence, PinyinOverrides } from '../types.js';

export interface Authored {
  sentences: AuthoredSentence[];
  grammar: AuthoredGrammar[];
  overrides: PinyinOverrides;
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
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error(`${path}: expected a JSON array`);
    out.push(...(parsed as T[]));
  }
  return out;
}

export async function loadAuthored(authoredDir: string): Promise<Authored> {
  let overrides: PinyinOverrides = {};
  try {
    overrides = JSON.parse(
      await readFile(join(authoredDir, 'pinyin-overrides.json'), 'utf8'),
    ) as PinyinOverrides;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  return {
    sentences: await readJsonArrays<AuthoredSentence>(join(authoredDir, 'sentences')),
    grammar: await readJsonArrays<AuthoredGrammar>(join(authoredDir, 'grammar')),
    overrides,
  };
}
