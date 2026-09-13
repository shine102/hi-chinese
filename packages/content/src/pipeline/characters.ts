import type { CharacterData, Word } from '../types.js';

export interface RawDictionaryEntry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  radical: string;
}

export interface RawGraphicsEntry {
  character: string;
  strokes: string[];
  medians: number[][][];
}

export function parseJsonLines<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

export function buildCharacters(
  dictionaryText: string,
  graphicsText: string,
  words: Word[],
  charHanViet: (ch: string) => string,
  viCharDefinitions: Record<string, string>,
): { characters: CharacterData[]; missing: string[] } {
  const wordIdsByChar = new Map<string, string[]>();
  for (const w of words) {
    for (const ch of w.characters) {
      const list = wordIdsByChar.get(ch) ?? [];
      list.push(w.id);
      wordIdsByChar.set(ch, list);
    }
  }

  const dictionary = new Map<string, RawDictionaryEntry>();
  for (const e of parseJsonLines<RawDictionaryEntry>(dictionaryText)) {
    if (wordIdsByChar.has(e.character)) dictionary.set(e.character, e);
  }
  const graphics = new Map<string, RawGraphicsEntry>();
  for (const e of parseJsonLines<RawGraphicsEntry>(graphicsText)) {
    if (wordIdsByChar.has(e.character)) graphics.set(e.character, e);
  }

  const characters: CharacterData[] = [];
  const missing: string[] = [];
  for (const [ch, wordIds] of wordIdsByChar) {
    const g = graphics.get(ch);
    if (!g) {
      missing.push(ch);
      continue;
    }
    const d = dictionary.get(ch);
    characters.push({
      character: ch,
      strokes: g.strokes,
      medians: g.medians,
      pinyin: d?.pinyin ?? [],
      hanViet: charHanViet(ch),
      definition: viCharDefinitions[ch] ?? d?.definition ?? null,
      radical: d?.radical ?? '',
      decomposition: d?.decomposition ?? '',
      wordIds,
    });
  }
  characters.sort((a, b) => a.character.localeCompare(b.character, 'zh'));
  missing.sort();
  return { characters, missing };
}
