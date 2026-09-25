import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AuthoredAssociationEntry,
  AuthoredGrammar,
  AuthoredHanViet,
  AuthoredSentence,
  AuthoredUnit,
  CharGloss,
  PinyinOverrides,
} from '../types.js';
import type { ReadingFixes } from './hsk.js';

export interface Authored {
  sentences: AuthoredSentence[];
  grammar: AuthoredGrammar[];
  overrides: PinyinOverrides;
  readingFixes: ReadingFixes;
  units: AuthoredUnit[];
  hanViet: AuthoredHanViet;
  meanings: Record<string, string[]>;
  charDefinitions: Record<string, string>;
  associations: Record<string, AuthoredAssociationEntry>;
  charGlosses: Record<string, CharGloss>;
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

async function readJsonObjectsMerged(dir: string): Promise<Record<string, unknown>> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const path = join(dir, name);
    const text = await readFile(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`${path}: invalid JSON: ${(e as Error).message}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${path}: expected a JSON object`);
    }
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (k in out) throw new Error(`${path}: key "${k}" is already defined by another file in ${dir}`);
      out[k] = v;
    }
  }
  return out;
}

async function readJsonObject<T>(path: string): Promise<T> {
  let text: string | undefined;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`${path}: invalid JSON: ${(e as Error).message}`);
  }
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
    readingFixes: await readJsonObject<ReadingFixes>(join(authoredDir, 'reading-fixes.json')),
    units: await readJsonArrays<AuthoredUnit>(join(authoredDir, 'units')),
    hanViet: {
      charMap: await readJsonObject<Record<string, string>>(join(authoredDir, 'hanviet', 'char-map.json')),
      wordOverrides: await readJsonObject<Record<string, string>>(join(authoredDir, 'hanviet', 'word-overrides.json')),
    },
    meanings: (await readJsonObjectsMerged(join(authoredDir, 'meanings'))) as Record<string, string[]>,
    charDefinitions: (await readJsonObjectsMerged(
      join(authoredDir, 'char-definitions'),
    )) as Record<string, string>,
    associations: (await readJsonObjectsMerged(
      join(authoredDir, 'associations'),
    )) as Record<string, AuthoredAssociationEntry>,
    charGlosses: await readJsonObject<Record<string, CharGloss>>(join(authoredDir, 'char-glosses.json')),
  };
}
