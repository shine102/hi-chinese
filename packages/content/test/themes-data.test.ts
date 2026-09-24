import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isFunctionWord, type ThemesFile } from '../src/pipeline/retheme.js';
import type { Word } from '../src/types.js';

// Spec 2026-09-24-l2-l3-retheme-design.md §2: authored subthemes cover exactly the
// content words of each level, with named, non-catch-all subthemes of 8-16 words.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const themesDir = resolve(here, '../src/authored/themes');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const LEVELS = [2] as const;
const CATCH_ALL = /(^|[\s:&])(khác|tổng hợp|linh tinh)(?=$|[\s&])|miêu tả & tính chất/i;

describe.each(LEVELS)('themes/level%i.json', (level) => {
  const load = async () => {
    const words = (await readJson<Word[]>(resolve(content, 'words.json'))).filter((w) => w.level === level);
    const themes = await readJson<ThemesFile>(resolve(themesDir, `level${level}.json`));
    return { words, themes };
  };

  it('maps exactly the content words of the level', async () => {
    const { words, themes } = await load();
    const contentWords = words.filter((w) => !isFunctionWord(w.pos)).map((w) => w.simplified).sort();
    expect(Object.keys(themes.words).sort()).toEqual(contentWords);
  });

  it('uses only declared subthemes, and every declared subtheme holds 8-16 words', async () => {
    const { themes } = await load();
    const ids = themes.subthemes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const counts = new Map(ids.map((id) => [id, 0]));
    for (const [w, sid] of Object.entries(themes.words)) {
      expect(counts.has(sid), `${w} → ${sid}`).toBe(true);
      counts.set(sid, counts.get(sid)! + 1);
    }
    const outOfRange = [...counts].filter(([, n]) => n < 8 || n > 16);
    expect(outOfRange).toEqual([]);
  });

  it('names subthemes "<broad>: <subtopic>", unique, with no catch-all', async () => {
    const { themes } = await load();
    for (const s of themes.subthemes) {
      expect(s.broad.includes(':'), s.id).toBe(false);
      expect(s.title.startsWith(`${s.broad}: `), s.id).toBe(true);
      expect(s.title.length).toBeGreaterThan(s.broad.length + 2);
      expect(CATCH_ALL.test(s.title), s.title).toBe(false);
    }
    const titles = themes.subthemes.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('keeps every broad theme under 40% of the content words', async () => {
    const { themes } = await load();
    const broadOf = new Map(themes.subthemes.map((s) => [s.id, s.broad]));
    const perBroad = new Map<string, number>();
    for (const sid of Object.values(themes.words)) {
      const b = broadOf.get(sid)!;
      perBroad.set(b, (perBroad.get(b) ?? 0) + 1);
    }
    const total = Object.keys(themes.words).length;
    const heavy = [...perBroad].filter(([, n]) => n / total > 0.4);
    expect(heavy).toEqual([]);
  });
});
