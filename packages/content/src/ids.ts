import type { HskLevel, Word } from './types.js';

export function wordId(simplified: string): string {
  return `w:${simplified}`;
}

export function unitId(level: HskLevel, indexInLevel: number): string {
  return `l${level}-u${String(indexInLevel).padStart(2, '0')}`;
}

export function characterFileName(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) throw new Error('characterFileName: empty string');
  return cp.toString(16).padStart(4, '0');
}

export function compareWords(a: Word, b: Word): number {
  return (
    a.level - b.level || a.frequency - b.frequency || a.simplified.localeCompare(b.simplified, 'zh')
  );
}

const HAN = /\p{Script=Han}/u;

export function uniqueHanChars(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (HAN.test(ch) && !seen.has(ch)) seen.add(ch);
  }
  return [...seen];
}
