import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkSentencePinyin, type PinyinIssue } from '../src/pipeline/sentence-pinyin.js';
import type { Word } from '../src/types.js';

// Spec 2026-09-24-unit-order-tech-debt-design.md §3: every sentence's pinyin spells its
// tokens' readings with the course's tone and word-boundary conventions.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const authored = resolve(here, '../src/authored');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

// `${sentenceId} ${token}` → why the checker's rule does not fit. Keep ≤ 10 entries.
const ALLOW: Record<string, string> = {
  's:l2:362 一': '高一年级 "one grade higher": yì, though 一年级 alone is the ordinal yī',
  's:l2:fill:096 一': 'arithmetic 一加一: counting yī before 加',
};

const key = (i: PinyinIssue) => `${i.id} ${i.token}`;

const allIssues = async () => {
  const words = await readJson<Word[]>(resolve(content, 'words.json'));
  const by = new Map(words.map((w) => [w.simplified, w]));
  const issues: PinyinIssue[] = [];
  for (const level of [1, 2, 3]) {
    const sentences = await readJson<{ id: string; pinyin: string; words: string[] }[]>(
      resolve(authored, `sentences/level${level}.json`),
    );
    for (const s of sentences) issues.push(...checkSentencePinyin(s, by));
  }
  return issues;
};

describe('word readings', () => {
  it('are numbered pinyin (fix malformed source forms in reading-fixes.json)', async () => {
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const ok = /^([a-zü:]+[1-5])( [a-zü:]+[1-5])*$/i;
    const bad = words.flatMap((w) =>
      [w.pinyinNumeric, ...w.alternates.map((a) => a.pinyinNumeric)]
        .filter((p) => !ok.test(p))
        .map((p) => `${w.simplified} ${p}`),
    );
    expect(bad).toEqual([]);
  });
});

describe('sentence pinyin', () => {
  it('matches token readings, tones and word boundaries', async () => {
    const issues = (await allIssues()).filter((i) => !(key(i) in ALLOW));
    expect(
      issues.map((i) => `${i.id} ${i.kind} ${i.token}: expected ${i.expected} got ${i.got}`),
    ).toEqual([]);
  });

  it('keeps the allowlist small and every entry still needed', async () => {
    expect(Object.keys(ALLOW).length).toBeLessThanOrEqual(10);
    const live = new Set((await allIssues()).map(key));
    expect(Object.keys(ALLOW).filter((k) => !live.has(k))).toEqual([]);
  });
});
