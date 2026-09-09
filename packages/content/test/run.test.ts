import { describe, expect, it } from 'vitest';
import type { Authored } from '../src/pipeline/authored.js';
import type { RawHskEntry } from '../src/pipeline/hsk.js';
import { assembleContent, type RunInputs } from '../src/pipeline/run.js';

function hskEntry(
  simplified: string,
  level: string,
  pinyin: string,
  numeric: string,
  meaning: string,
  frequency: number,
): RawHskEntry {
  return {
    simplified,
    radical: 'x',
    level: [level],
    frequency,
    pos: ['x'],
    forms: [
      {
        traditional: simplified,
        transcriptions: { pinyin, numeric },
        meanings: [meaning],
        classifiers: [],
      },
    ],
  };
}

function graphicsLine(character: string): string {
  return JSON.stringify({ character, strokes: ['M 0 0'], medians: [[[0, 0]]] });
}

function dictionaryLine(character: string): string {
  return JSON.stringify({
    character,
    definition: 'x',
    pinyin: ['x'],
    decomposition: '',
    radical: '',
  });
}

const authored = (overrides: Partial<Authored> = {}): Authored => ({
  sentences: [],
  grammar: [],
  overrides: {},
  ...overrides,
});

describe('assembleContent', () => {
  it('assembles a valid tiny corpus', () => {
    const entries: RawHskEntry[] = [
      hskEntry('我', 'new-1', 'wǒ', 'wo3', 'I', 1),
      hskEntry('是', 'new-1', 'shì', 'shi4', 'to be', 2),
    ];
    const inputs: RunInputs = {
      hskJson: JSON.stringify(entries),
      dictionaryText: [dictionaryLine('我'), dictionaryLine('是')].join('\n'),
      graphicsText: [graphicsLine('我'), graphicsLine('是')].join('\n'),
      authored: authored({
        sentences: [
          { id: 's1', zh: '我是。', pinyin: 'Wǒ shì.', en: 'I am.', words: ['我', '是'] },
        ],
        grammar: [
          {
            id: 'g1',
            title: 't',
            pattern: 'p',
            explanation: 'e',
            level: 1,
            examples: ['s1'],
          },
        ],
      }),
    };
    const result = assembleContent(inputs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.units.map((u) => u.id)).toEqual(['l1-u01']);
    expect(result.bundle.sentences.map((s) => s.id)).toEqual(['s1']);
    expect(result.bundle.grammar.map((g) => g.id)).toEqual(['g1']);
  });

  it('reports an unknown-token placement problem', () => {
    const entries: RawHskEntry[] = [
      hskEntry('我', 'new-1', 'wǒ', 'wo3', 'I', 1),
      hskEntry('是', 'new-1', 'shì', 'shi4', 'to be', 2),
    ];
    const inputs: RunInputs = {
      hskJson: JSON.stringify(entries),
      dictionaryText: [dictionaryLine('我'), dictionaryLine('是')].join('\n'),
      graphicsText: [graphicsLine('我'), graphicsLine('是')].join('\n'),
      authored: authored({
        sentences: [
          {
            id: 's1',
            zh: '我是猫。',
            pinyin: 'Wǒ shì māo.',
            en: 'I am a cat.',
            words: ['我', '是', '猫'],
          },
        ],
      }),
    };
    const result = assembleContent(inputs);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.startsWith('[placement:unknown-token]'))).toBe(true);
  });

  it('reports missing stroke data for a character with no graphics line', () => {
    const entries: RawHskEntry[] = [
      hskEntry('我', 'new-1', 'wǒ', 'wo3', 'I', 1),
      hskEntry('是', 'new-1', 'shì', 'shi4', 'to be', 2),
    ];
    const inputs: RunInputs = {
      hskJson: JSON.stringify(entries),
      dictionaryText: [dictionaryLine('我'), dictionaryLine('是')].join('\n'),
      graphicsText: [graphicsLine('我')].join('\n'),
      authored: authored(),
    };
    const result = assembleContent(inputs);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toContain('[characters] no stroke data for 是');
  });

  it('reports a level-mismatch placement problem when an example needs a later level', () => {
    const entries: RawHskEntry[] = [
      hskEntry('我', 'new-1', 'wǒ', 'wo3', 'I', 1),
      hskEntry('你', 'new-2', 'nǐ', 'ni3', 'you', 1),
    ];
    const inputs: RunInputs = {
      hskJson: JSON.stringify(entries),
      dictionaryText: [dictionaryLine('我'), dictionaryLine('你')].join('\n'),
      graphicsText: [graphicsLine('我'), graphicsLine('你')].join('\n'),
      authored: authored({
        sentences: [{ id: 's1', zh: '你。', pinyin: 'Nǐ.', en: 'You.', words: ['你'] }],
        grammar: [
          {
            id: 'g1',
            title: 't',
            pattern: 'p',
            explanation: 'e',
            level: 1,
            examples: ['s1'],
          },
        ],
      }),
    };
    const result = assembleContent(inputs);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.startsWith('[placement:level-mismatch]'))).toBe(true);
  });
});
