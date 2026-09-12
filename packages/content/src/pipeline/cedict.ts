export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  meanings: string[];
}

const LINE_RE = /^(\S+) (\S+) \[([^\]]*)\] \/(.+)\/$/;

export function parseCedictLine(line: string): CedictEntry | null {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return null;
  const m = LINE_RE.exec(trimmed);
  if (!m) return null;
  const [, traditional, simplified, pinyin, sensesRaw] = m;
  const meanings = sensesRaw!.split('/').filter((s) => s.length > 0);
  return { traditional: traditional!, simplified: simplified!, pinyin: pinyin!, meanings };
}

export function parseCedict(text: string): CedictEntry[] {
  const out: CedictEntry[] = [];
  for (const line of text.split('\n')) {
    const e = parseCedictLine(line);
    if (e) out.push(e);
  }
  return out;
}

export function normalizeCedictPinyin(pinyin: string): string {
  return pinyin.replace(/u:/g, 'ü');
}

const TONE_MAP: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
};

export function pinyinSyllableToNumeric(syllable: string): string {
  for (const ch of syllable) {
    const hit = TONE_MAP[ch];
    if (hit) {
      const [base, tone] = hit;
      return syllable.replace(ch, base) + tone;
    }
  }
  return `${syllable}5`;
}

export function pinyinToNumeric(pinyin: string): string {
  return pinyin
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map(pinyinSyllableToNumeric)
    .join(' ');
}
