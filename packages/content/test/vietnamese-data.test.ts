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

// Regression guard: CVDICT/CEDICT embed classifier-list and radical-index metadata as
// pseudo-senses (e.g. "LT:個|个[ge4]", "Lượng từ: 個|个[ge4]", "Bộ Khang Hy số 145"). This
// leaked into the authored data three times across hand-edits during P2 (see cedict.ts's
// isMetadataSense/stripInlineMetadata, added to fix it at the parser level) before this
// guard existed. It checks the DATA directly, independent of the parser, so a future
// hand-edit that reintroduces the same shape fails here rather than shipping silently.
describe('No leaked CEDICT/CVDICT metadata in authored Vietnamese content', () => {
  const WHOLE_METADATA_RE =
    /^(LT|CL)\s*:|^lượng từ\s*:\s*[\s\S]*\[[a-z]+[1-5]?\]|^bộ\s*(thủ\s*)?khang hy\s*(số|thứ)\s*\d+\s*$/i;
  const ORPHAN_CITATION_RE = /^[^\s,()]*\[[a-z]+[1-5]?\](,[^\s,()]*\[[a-z]+[1-5]?\])*$/i;
  const INLINE_LEAK_RE = /\((?:lượng từ|LT|CL)\s*:\s*[^()]*\[[a-z]+[1-5]?\][^()]*\)/i;

  it('has no metadata-shaped senses in meanings/level*.json', async () => {
    const bad: string[] = [];
    for (const level of [1, 2, 3]) {
      const m = (await readJson(resolve(authored, `meanings/level${level}.json`))) as Record<string, string[]>;
      for (const [word, senses] of Object.entries(m)) {
        for (const s of senses) {
          if (WHOLE_METADATA_RE.test(s.trim()) || ORPHAN_CITATION_RE.test(s.trim()) || INLINE_LEAK_RE.test(s)) {
            bad.push(`L${level} ${word}: ${JSON.stringify(s)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('has no metadata-shaped segments in char-definitions/base.json', async () => {
    const defs = (await readJson(resolve(authored, 'char-definitions/base.json'))) as Record<string, string>;
    const bad: string[] = [];
    for (const [ch, def] of Object.entries(defs)) {
      if (INLINE_LEAK_RE.test(def)) bad.push(`${ch} (inline): ${JSON.stringify(def)}`);
      for (const seg of def.split(', ')) {
        if (WHOLE_METADATA_RE.test(seg.trim()) || ORPHAN_CITATION_RE.test(seg.trim())) {
          bad.push(`${ch}: ${JSON.stringify(seg)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
