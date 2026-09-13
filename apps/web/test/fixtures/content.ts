import type { CharacterData, ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import type { ContentLoaders } from '../../src/content/provider.js';

function word(
  simplified: string,
  pinyin: string,
  pinyinNumeric: string,
  meanings: string[],
  unitId: string,
  frequency: number,
  hanViet: string,
): Word {
  return {
    id: `w:${simplified}`,
    simplified,
    traditional: simplified,
    pinyin,
    pinyinNumeric,
    hanViet,
    meanings,
    alternates: [],
    pos: [],
    classifiers: [],
    level: 1,
    frequency,
    characters: [...simplified],
    unitId,
  };
}

export const fixtureWords: Word[] = [
  word('我', 'wǒ', 'wo3', ['I; me'], 'l1-u01', 1, 'Ngã'),
  word('你', 'nǐ', 'ni3', ['you'], 'l1-u01', 2, 'Nhĩ'),
  word('他', 'tā', 'ta1', ['he; him'], 'l1-u01', 3, 'Tha'),
  word('是', 'shì', 'shi4', ['to be; yes'], 'l1-u01', 4, 'Thị'),
  word('不', 'bù', 'bu4', ['not; no'], 'l1-u01', 5, 'Bất'),
  word('好', 'hǎo', 'hao3', ['good; well'], 'l1-u01', 6, 'Hảo'),
  word('们', 'men', 'men5', ['plural suffix for pronouns'], 'l1-u02', 7, 'Môn'),
  word('老师', 'lǎoshī', 'lao3shi1', ['teacher'], 'l1-u02', 8, 'Lão sư'),
  word('学生', 'xuésheng', 'xue2sheng5', ['student'], 'l1-u02', 9, 'Học sinh'),
  word('吗', 'ma', 'ma5', ['question particle'], 'l1-u02', 10, 'Ma'),
];

export const fixtureUnit1: UnitChunk = {
  unit: {
    id: 'l1-u01',
    level: 1,
    order: 1,
    title: 'Unit 1',
    wordIds: ['w:我', 'w:你', 'w:他', 'w:是', 'w:不', 'w:好'],
    grammarIds: ['g:bu-negation'],
    sentenceIds: ['s:l1:001', 's:l1:002', 's:l1:003'],
  },
  grammar: [
    {
      id: 'g:bu-negation',
      title: 'Negating with 不',
      pattern: '不 + verb / adjective',
      explanation: '不 (bù) goes directly before a verb or adjective to negate it.',
      level: 1,
      sentenceIds: ['s:l1:002', 's:l1:003'],
      unitId: 'l1-u01',
    },
  ],
  sentences: [
    {
      id: 's:l1:001',
      zh: '你好。',
      pinyin: 'Nǐ hǎo.',
      vi: 'Hello.',
      wordIds: ['w:你', 'w:好'],
      unitId: 'l1-u01',
    },
    {
      id: 's:l1:002',
      zh: '我不是他。',
      pinyin: 'Wǒ bú shì tā.',
      vi: 'I am not him.',
      wordIds: ['w:我', 'w:不', 'w:是', 'w:他'],
      unitId: 'l1-u01',
    },
    {
      id: 's:l1:003',
      zh: '他不好。',
      pinyin: 'Tā bù hǎo.',
      vi: 'He is not well.',
      wordIds: ['w:他', 'w:不', 'w:好'],
      unitId: 'l1-u01',
    },
  ],
};

export const fixtureUnit2: UnitChunk = {
  unit: {
    id: 'l1-u02',
    level: 1,
    order: 2,
    title: 'Unit 2',
    wordIds: ['w:们', 'w:老师', 'w:学生', 'w:吗'],
    grammarIds: [],
    sentenceIds: [],
  },
  grammar: [],
  sentences: [],
};

export const fixtureManifest: ContentManifest = {
  version: 'fixture',
  generatedAt: '2026-09-10T00:00:00.000Z',
  levels: [{ level: 1, title: 'HSK 1', unitIds: ['l1-u01', 'l1-u02'] }],
  units: [
    { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 6, grammarCount: 1 },
    { id: 'l1-u02', level: 1, order: 2, title: 'Unit 2', wordCount: 4, grammarCount: 0 },
  ],
  characters: ['我', '你', '他', '是', '不', '好', '们'],
  counts: { words: 10, characters: 7, grammar: 1, sentences: 3, units: 2 },
};

export const fixtureCharacters: CharacterData[] = [
  {
    character: '我',
    strokes: ['M 350 400 Q 400 350 450 400'],
    medians: [
      [
        [350, 400],
        [400, 350],
        [450, 400],
      ],
    ],
    pinyin: ['wǒ'],
    hanViet: 'Ngã',
    definition: 'I; me',
    radical: '戈',
    decomposition: '⿰扌戈',
    wordIds: ['w:我'],
  },
  {
    character: '你',
    strokes: ['M 300 400 Q 350 350 400 400'],
    medians: [
      [
        [300, 400],
        [350, 350],
        [400, 400],
      ],
    ],
    pinyin: ['nǐ'],
    hanViet: 'Nhĩ',
    definition: 'you',
    radical: '亻',
    decomposition: '⿰亻尔',
    wordIds: ['w:你'],
  },
];

export function fixtureLoaders(): ContentLoaders {
  return {
    manifest: async () => fixtureManifest,
    words: async () => fixtureWords,
    unit: async (unitId) => {
      if (unitId === 'l1-u01') return fixtureUnit1;
      if (unitId === 'l1-u02') return fixtureUnit2;
      throw new Error(`no fixture unit ${unitId}`);
    },
  };
}
