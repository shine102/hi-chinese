import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const authored = resolve(here, '../src/authored');
const content = resolve(here, '../../../apps/web/public/content');
const HAN = /\p{Script=Han}/u;

const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

async function courseChars(): Promise<Set<string>> {
  const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
  const set = new Set<string>();
  for (const w of words) for (const ch of w.simplified) if (HAN.test(ch)) set.add(ch);
  return set;
}

const TITLE = /^\p{Lu}[\p{Ll}\p{M}]*$/u; // one Title-Case syllable (allows combining marks for tones)

describe('char-map.json', () => {
  it('covers every course character', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const missing = [...(await courseChars())].filter((ch) => !map[ch] || map[ch].trim() === '');
    expect(missing).toEqual([]);
  });

  it('every value is a single Title-Case syllable', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const bad = Object.entries(map).filter(([, v]) => !TITLE.test(v));
    expect(bad).toEqual([]);
  });

  it('matches a hand-verified sample of high-frequency readings', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const oracle: Record<string, string> = {
      我: 'Ngã', 你: 'Nhĩ', 好: 'Hảo', 他: 'Tha', 是: 'Thị', 不: 'Bất',
      谢: 'Tạ', 再: 'Tái', 见: 'Kiến', 人: 'Nhân', 中: 'Trung', 国: 'Quốc',
      学: 'Học', 生: 'Sinh', 老: 'Lão', 师: 'Sư', 名: 'Danh', 字: 'Tự',
      银: 'Ngân', 行: 'Hành', 文: 'Văn', 家: 'Gia', 有: 'Hữu',
    };
    for (const [ch, hv] of Object.entries(oracle)) expect(map[ch]).toBe(hv);
  });
});

describe('word-overrides.json', () => {
  it('is a valid string→string map with Title-Case space-joined values', async () => {
    const ov = (await readJson(resolve(authored, 'hanviet/word-overrides.json'))) as Record<string, string>;
    const bad = Object.entries(ov).filter(
      ([, v]) => v.trim() === '' || v.split(' ').some((s) => !TITLE.test(s)),
    );
    expect(bad).toEqual([]);
  });

  it('includes the known 行=Hàng polyphone words and not redundant defaults', async () => {
    const ov = (await readJson(resolve(authored, 'hanviet/word-overrides.json'))) as Record<string, string>;
    expect(ov['银行']).toBe('Ngân Hàng');
    // default-correct words must NOT be overridden
    expect(ov['谢谢']).toBeUndefined();
    expect(ov['再见']).toBeUndefined();
  });
});
