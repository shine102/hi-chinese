import type { GrammarPoint, Sentence, Word } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../src/lessons/compute.js';
import { generateSlides, type Slide } from '../../src/lessons/slides.js';

const CHARS = '一二三四五六七八九十百千万';

function word(n: number, unitId: string): Word {
  const ch = CHARS[n % CHARS.length]!;
  return {
    id: `w:${n}`,
    simplified: ch,
    traditional: ch,
    pinyin: `p${n}`,
    pinyinNumeric: `p${n}1`,
    hanViet: '',
    meanings: [`m${n}`],
    alternates: [],
    pos: [],
    classifiers: [],
    level: 2,
    frequency: n,
    characters: [ch],
    unitId,
  };
}

// w:1..w:4 belong to an earlier unit; w:11..w:18 to this unit (l2-u02).
const words = new Map<string, Word>();
for (const n of [1, 2, 3, 4]) words.set(`w:${n}`, word(n, 'l2-u01'));
for (const n of [11, 12, 13, 14, 15, 16, 17, 18]) words.set(`w:${n}`, word(n, 'l2-u02'));

function sentence(id: string, wordIds: string[]): Sentence {
  return { id, zh: '', pinyin: '', vi: '', wordIds, unitId: 'l2-u02' };
}

// Lesson 1 of l2-u02: new w:15..w:18, review w:11..w:14; nothing later in the unit
// except w:19 (declared below as a same-unit later-lesson word).
words.set('w:19', word(19, 'l2-u02'));
const lesson: Lesson = {
  index: 1,
  wordIds: ['w:15', 'w:16', 'w:17', 'w:18'],
  reviewWordIds: ['w:11', 'w:12', 'w:13', 'w:14'],
  grammarIds: ['g:x'],
  sentenceIds: ['s:earlier', 's:later'],
};

function grammarIntro(slides: Slide[]) {
  return slides.find((s): s is Extract<Slide, { type: 'grammar-intro' }> => s.type === 'grammar-intro');
}

function run(grammar: GrammarPoint, sentences: Sentence[]) {
  return grammarIntro(
    generateSlides(
      {
        lesson,
        allSentences: sentences,
        allGrammar: [grammar],
        words,
        levelWordIds: [...words.keys()],
        audio: false,
      },
      1,
    ),
  );
}

describe('generateSlides grammar-intro examples', () => {
  const earlier = sentence('s:earlier', ['w:1', 'w:15', 'w:2']); // uses earlier-unit words
  const later = sentence('s:later', ['w:16', 'w:19']); // uses a later-lesson word of this unit

  it('shows an example that uses words from an earlier unit', () => {
    const g: GrammarPoint = {
      id: 'g:x', title: 'X', pattern: '', explanation: 'e', level: 2,
      sentenceIds: ['s:elsewhere', 's:earlier'], unitId: 'l2-u02',
    };
    expect(run(g, [earlier])?.sentenceIds).toEqual(['s:earlier']);
  });

  it('excludes an example containing a later-lesson word of the same unit', () => {
    const g: GrammarPoint = {
      id: 'g:x', title: 'X', pattern: '', explanation: 'e', level: 2,
      sentenceIds: ['s:earlier', 's:later'], unitId: 'l2-u02',
    };
    expect(run(g, [earlier, later])?.sentenceIds).toEqual(['s:earlier']);
  });

  it('never emits ids that are not among the unit sentences', () => {
    const g: GrammarPoint = {
      id: 'g:x', title: 'X', pattern: '', explanation: 'e', level: 2,
      sentenceIds: ['s:elsewhere-1', 's:elsewhere-2', 's:later'], unitId: 'l2-u02',
    };
    const slide = run(g, [later]);
    const known = new Set(['s:later']);
    for (const sid of slide?.sentenceIds ?? []) expect(known.has(sid)).toBe(true);
  });
});
