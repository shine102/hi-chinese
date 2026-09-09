import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAuthored } from '../src/pipeline/authored.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hi-chinese-authored-'));
  await mkdir(join(dir, 'sentences'));
  await mkdir(join(dir, 'grammar'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadAuthored', () => {
  it('reads overrides, sentences and grammar in filename order', async () => {
    await writeFile(join(dir, 'pinyin-overrides.json'), JSON.stringify({ 了: 'le5' }));
    await writeFile(
      join(dir, 'sentences', 'b.json'),
      JSON.stringify([{ id: 's2', zh: '你。', pinyin: 'nǐ', en: 'you', words: ['你'] }]),
    );
    await writeFile(
      join(dir, 'sentences', 'a.json'),
      JSON.stringify([{ id: 's1', zh: '我。', pinyin: 'wǒ', en: 'I', words: ['我'] }]),
    );
    await writeFile(
      join(dir, 'grammar', 'a.json'),
      JSON.stringify([
        { id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 1, examples: ['s1'] },
      ]),
    );
    const a = await loadAuthored(dir);
    expect(a.overrides).toEqual({ 了: 'le5' });
    expect(a.sentences.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(a.grammar.map((g) => g.id)).toEqual(['g1']);
  });
  it('tolerates a missing overrides file and empty folders', async () => {
    const a = await loadAuthored(dir);
    expect(a).toEqual({ sentences: [], grammar: [], overrides: {} });
  });
  it('rejects a file that is not an array', async () => {
    await writeFile(join(dir, 'grammar', 'bad.json'), JSON.stringify({ id: 'g1' }));
    await expect(loadAuthored(dir)).rejects.toThrow(/bad\.json.*array/);
  });
});
