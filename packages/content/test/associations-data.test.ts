import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isLabelOnlyMeaning, PARTICLE_POS } from '../src/pipeline/assoc-context.js';
import { ASSOCIATION_LEVELS_DONE, GLOSSES_DONE, MAX_ASSOCIATIONS, MIN_ASSOCIATIONS } from '../src/pipeline/associations.js';
import type { AuthoredAssociationEntry, CharacterData, Word } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const authoredDir = resolve(here, '../src/authored');
const readJson = async <T>(p: string) => JSON.parse(await readFile(p, 'utf8')) as T;

async function authoredAssociations(): Promise<Record<string, AuthoredAssociationEntry>> {
  const out: Record<string, AuthoredAssociationEntry> = {};
  const dir = resolve(authoredDir, 'associations');
  const names = await readdir(dir).catch(() => [] as string[]);
  for (const n of names.filter((n) => n.endsWith('.json'))) Object.assign(out, await readJson(resolve(dir, n)));
  return out;
}

// Spec 2026-09-25-char-associations-design.md. Coverage checks apply only to finished levels
// (ASSOCIATION_LEVELS_DONE) and, for glosses, once GLOSSES_DONE is flipped.
describe('character associations (shipped data)', () => {
  it('gives every single-character word of a finished level 1–3 associations or an explicit none', async () => {
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const authored = await authoredAssociations();
    const gaps = words
      .filter((w) => ASSOCIATION_LEVELS_DONE.includes(w.level) && [...w.simplified].length === 1)
      .filter((w) => {
        const entry = authored[w.simplified];
        if (entry !== undefined && !Array.isArray(entry)) return false;
        const n = w.associations?.length ?? 0;
        return n < MIN_ASSOCIATIONS || n > MAX_ASSOCIATIONS;
      })
      .map((w) => w.simplified);
    expect(gaps).toEqual([]);
  });

  it('puts a real sense first for single-character words of a finished level (particles exempt)', async () => {
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const bad = words
      .filter((w) => ASSOCIATION_LEVELS_DONE.includes(w.level) && [...w.simplified].length === 1)
      .filter((w) => !w.pos.some((p) => PARTICLE_POS.includes(p)))
      .filter((w) => isLabelOnlyMeaning(w.meanings[0] ?? ''))
      .map((w) => `${w.simplified}: ${w.meanings[0]}`);
    expect(bad).toEqual([]);
  });

  it('has a gloss for every character once glosses are done', async () => {
    if (!GLOSSES_DONE) return;
    const files = (await readdir(resolve(content, 'characters'))).filter((n) => n.endsWith('.json'));
    const missing: string[] = [];
    for (const f of files) {
      const c = await readJson<CharacterData>(resolve(content, 'characters', f));
      if (c.gloss.trim() === '') missing.push(c.character);
    }
    expect(missing).toEqual([]);
  });

  it('has a gloss for every word part once glosses are done', async () => {
    if (!GLOSSES_DONE) return;
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const offenders = words
      .filter((w) => (w.parts?.some((p) => p.gloss.trim() === '') ?? false))
      .map((w) => `${w.simplified} (${w.id}): ${w.parts!.filter((p) => p.gloss.trim() === '').map((p) => p.char).join(',')}`);
    expect(offenders).toEqual([]);
  });

  it('keeps CVDICT metadata out of association and gloss text', async () => {
    const texts = [
      ...Object.values(await authoredAssociations()).flatMap((e) => (Array.isArray(e) ? e.map((a) => a.vi) : [])),
      ...Object.values(
        await readJson<Record<string, string | Record<string, string>>>(resolve(authoredDir, 'char-glosses.json')).catch(
          () => ({}),
        ),
      ).flatMap((g) => (typeof g === 'string' ? [g] : Object.values(g))),
    ];
    expect(texts.filter((t) => /\[[a-z]+[1-5]\]|khang hy|lượng từ\s*:/i.test(t))).toEqual([]);
  });

  it('keeps words.json under the precache budget', async () => {
    expect((await stat(resolve(content, 'words.json'))).size).toBeLessThan(2.5 * 1024 * 1024);
  });
});
