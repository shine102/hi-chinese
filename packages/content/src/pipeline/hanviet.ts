import type { AuthoredHanViet, HanVietResolver } from '../types.js';

const HAN = /\p{Script=Han}/u;

export function makeHanViet(data: AuthoredHanViet): HanVietResolver {
  const { charMap, wordOverrides } = data;
  const char = (ch: string): string => charMap[ch] ?? '';
  const word = (simplified: string): string => {
    const override = wordOverrides[simplified];
    if (override !== undefined) return override;
    const parts: string[] = [];
    for (const ch of simplified) {
      if (!HAN.test(ch)) continue;
      const r = charMap[ch];
      if (r === undefined) return '';
      parts.push(r);
    }
    return parts.join(' ');
  };
  return { char, word };
}
