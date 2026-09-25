export type HskLevel = 1 | 2 | 3;

export interface WordReading {
  pinyin: string;
  pinyinNumeric: string;
  meanings: string[];
}

export interface Word {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumeric: string;
  hanViet: string;
  meanings: string[];
  alternates: WordReading[];
  pos: string[];
  classifiers: string[];
  level: HskLevel;
  frequency: number;
  characters: string[];
  unitId: string;
  /** Single-character words only: 2–3 compounds that show the character in use (not taught). */
  associations?: Association[];
  /** Multi-character words only: each character with its Hán Việt and core gloss. */
  parts?: WordPart[];
}

export interface Association {
  zh: string;
  pinyin: string;
  hanViet: string;
  vi: string;
  wordId?: string;
}

export interface WordPart {
  char: string;
  hanViet: string;
  gloss: string;
  wordId?: string;
}

export interface AuthoredAssociation {
  zh: string;
  vi: string;
  pinyin?: string;
  hanViet?: string;
}

export type AuthoredAssociationEntry = AuthoredAssociation[] | { none: string };

export type CharGloss = string | Record<string, string>;

export interface CharacterData {
  character: string;
  strokes: string[];
  medians: number[][][];
  pinyin: string[];
  hanViet: string;
  definition: string | null;
  radical: string;
  decomposition: string;
  wordIds: string[];
}

export interface Sentence {
  id: string;
  zh: string;
  pinyin: string;
  vi: string;
  wordIds: string[];
  unitId: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  level: HskLevel;
  sentenceIds: string[];
  unitId: string;
}

export interface Unit {
  id: string;
  level: HskLevel;
  order: number;
  title: string;
  wordIds: string[];
  grammarIds: string[];
  sentenceIds: string[];
}

export interface UnitChunk {
  unit: Unit;
  grammar: GrammarPoint[];
  sentences: Sentence[];
}

export interface ManifestUnit {
  id: string;
  level: HskLevel;
  order: number;
  title: string;
  wordCount: number;
  grammarCount: number;
}

export interface ContentManifest {
  version: string;
  generatedAt: string;
  levels: { level: HskLevel; title: string; unitIds: string[] }[];
  units: ManifestUnit[];
  characters: string[];
  counts: {
    words: number;
    characters: number;
    grammar: number;
    sentences: number;
    units: number;
  };
}

export interface ContentBundle {
  words: Word[];
  characters: CharacterData[];
  units: Unit[];
  grammar: GrammarPoint[];
  sentences: Sentence[];
}

export interface AuthoredSentence {
  id: string;
  zh: string;
  pinyin: string;
  vi: string;
  words: string[];
}

export interface AuthoredUnit {
  id: string;
  level: HskLevel;
  order: number;
  title: string;
  words: string[];
}

export interface AuthoredGrammar {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  level: HskLevel;
  examples: string[];
  /** Simplified form of a course word; the point is placed in that word's unit. */
  anchor?: string;
}

export type PinyinOverrides = Record<string, string>;

export interface AuthoredHanViet {
  charMap: Record<string, string>;
  wordOverrides: Record<string, string>;
}

export interface HanVietResolver {
  char(ch: string): string;
  word(simplified: string): string;
}
