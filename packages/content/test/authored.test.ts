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
      JSON.stringify([{ id: 's2', zh: '你。', pinyin: 'nǐ', vi: 'you', words: ['你'] }]),
    );
    await writeFile(
      join(dir, 'sentences', 'a.json'),
      JSON.stringify([{ id: 's1', zh: '我。', pinyin: 'wǒ', vi: 'I', words: ['我'] }]),
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
    expect(a).toEqual({
      sentences: [],
      grammar: [],
      overrides: {},
      readingFixes: {},
      units: [],
      hanViet: { charMap: {}, wordOverrides: {} },
      meanings: {},
      charDefinitions: {},
    });
  });
  it('rejects a file that is not an array', async () => {
    await writeFile(join(dir, 'grammar', 'bad.json'), JSON.stringify({ id: 'g1' }));
    await expect(loadAuthored(dir)).rejects.toThrow(/bad\.json.*array/);
  });
  it('rejects a file with invalid JSON', async () => {
    await writeFile(join(dir, 'grammar', 'bad.json'), '[{"id": }');
    await expect(loadAuthored(dir)).rejects.toThrow(/bad\.json.*invalid JSON/);
  });
  it('reads authored units from the units/ directory in filename order', async () => {
    await mkdir(join(dir, 'units'));
    await writeFile(
      join(dir, 'units', 'level1.json'),
      JSON.stringify([
        { id: 'l1-u01', level: 1, order: 1, title: 'Hello!', words: ['你', '好'] },
      ]),
    );
    const authored = await loadAuthored(dir);
    expect(authored.units).toEqual([
      { id: 'l1-u01', level: 1, order: 1, title: 'Hello!', words: ['你', '好'] },
    ]);
  });
  it('returns an empty units array when the units/ directory is absent', async () => {
    const authored = await loadAuthored(dir);
    expect(authored.units).toEqual([]);
  });
  it('reads hanviet charMap and wordOverrides from files', async () => {
    await mkdir(join(dir, 'hanviet'));
    await writeFile(
      join(dir, 'hanviet', 'char-map.json'),
      JSON.stringify({ 再: 'Tái', 见: 'Kiến' }),
    );
    await writeFile(
      join(dir, 'hanviet', 'word-overrides.json'),
      JSON.stringify({ 银行: 'Ngân Hàng' }),
    );
    const authored = await loadAuthored(dir);
    expect(authored.hanViet.charMap).toEqual({ 再: 'Tái', 见: 'Kiến' });
    expect(authored.hanViet.wordOverrides).toEqual({ 银行: 'Ngân Hàng' });
  });
  it('returns empty hanviet objects when hanviet/ directory is absent', async () => {
    const authored = await loadAuthored(dir);
    expect(authored.hanViet).toEqual({ charMap: {}, wordOverrides: {} });
  });
  it('merges meanings and char-definitions across multiple files', async () => {
    await mkdir(join(dir, 'meanings'));
    await writeFile(join(dir, 'meanings', 'a.json'), JSON.stringify({ 你: ['bạn'] }));
    await writeFile(join(dir, 'meanings', 'b.json'), JSON.stringify({ 好: ['tốt'] }));
    await mkdir(join(dir, 'char-definitions'));
    await writeFile(join(dir, 'char-definitions', 'a.json'), JSON.stringify({ 你: 'bạn' }));
    const authored = await loadAuthored(dir);
    expect(authored.meanings).toEqual({ 你: ['bạn'], 好: ['tốt'] });
    expect(authored.charDefinitions).toEqual({ 你: 'bạn' });
  });
  it('returns empty meanings/charDefinitions when their directories are absent', async () => {
    const authored = await loadAuthored(dir);
    expect(authored.meanings).toEqual({});
    expect(authored.charDefinitions).toEqual({});
  });
  it('rejects a duplicate key across meanings files', async () => {
    await mkdir(join(dir, 'meanings'));
    await writeFile(join(dir, 'meanings', 'a.json'), JSON.stringify({ 你: ['bạn'] }));
    await writeFile(join(dir, 'meanings', 'b.json'), JSON.stringify({ 你: ['bạn 2'] }));
    await expect(loadAuthored(dir)).rejects.toThrow(/already defined/);
  });
});
