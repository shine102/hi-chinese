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
  meanings: string[];
  alternates: WordReading[];
  pos: string[];
  classifiers: string[];
  level: HskLevel;
  frequency: number;
  characters: string[];
  unitId: string;
}

export interface CharacterData {
  character: string;
  strokes: string[];
  medians: number[][][];
  pinyin: string[];
  definition: string | null;
  radical: string;
  decomposition: string;
  wordIds: string[];
}

export interface Sentence {
  id: string;
  zh: string;
  pinyin: string;
  en: string;
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
  en: string;
  words: string[];
}

export interface AuthoredGrammar {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  level: HskLevel;
  examples: string[];
}

export type PinyinOverrides = Record<string, string>;
