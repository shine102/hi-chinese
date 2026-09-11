import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeLessons, lessonCount } from '../../src/lessons/compute.js';

describe('lessonCount', () => {
  it('returns ceil(wordCount / 4)', () => {
    expect(lessonCount(12)).toBe(3);
    expect(lessonCount(6)).toBe(2);
    expect(lessonCount(4)).toBe(1);
    expect(lessonCount(14)).toBe(4);
    expect(lessonCount(17)).toBe(5);
    expect(lessonCount(1)).toBe(1);
  });
});

describe('computeLessons', () => {
  const unit12: Unit = {
    id: 'l1-u01', level: 1, order: 1, title: 'Unit 1',
    wordIds: ['w:1','w:2','w:3','w:4','w:5','w:6','w:7','w:8','w:9','w:10','w:11','w:12'],
    grammarIds: ['g:1','g:2'], sentenceIds: ['s:1','s:2','s:3','s:4'],
  };

  const sentences: Sentence[] = [
    { id: 's:1', zh: '一二', pinyin: '', en: '', wordIds: ['w:1','w:2'], unitId: 'l1-u01' },
    { id: 's:2', zh: '三四', pinyin: '', en: '', wordIds: ['w:3','w:4'], unitId: 'l1-u01' },
    { id: 's:3', zh: '五六', pinyin: '', en: '', wordIds: ['w:5','w:6'], unitId: 'l1-u01' },
    { id: 's:4', zh: '九十', pinyin: '', en: '', wordIds: ['w:9','w:10'], unitId: 'l1-u01' },
  ];

  const grammar: GrammarPoint[] = [
    { id: 'g:1', title: 'G1', pattern: '', explanation: '', level: 1,
      sentenceIds: ['s:1','s:2'], unitId: 'l1-u01' },
    { id: 'g:2', title: 'G2', pattern: '', explanation: '', level: 1,
      sentenceIds: ['s:3','s:4'], unitId: 'l1-u01' },
  ];

  it('splits 12 words into 3 lessons of 4', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons).toHaveLength(3);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[1]!.wordIds).toEqual(['w:5','w:6','w:7','w:8']);
    expect(lessons[2]!.wordIds).toEqual(['w:9','w:10','w:11','w:12']);
  });

  it('first lesson has no reviewWordIds', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[0]!.reviewWordIds).toEqual([]);
  });

  it('second lesson reviews first lesson words', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[1]!.reviewWordIds).toEqual(['w:1','w:2','w:3','w:4']);
  });

  it('third lesson reviews first and second lesson words', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[2]!.reviewWordIds).toEqual(
      ['w:1','w:2','w:3','w:4','w:5','w:6','w:7','w:8'],
    );
  });

  it('assigns grammar to the lesson containing its earliest sentence word', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    // g:1 sentences use words w:1-w:4 → both in lesson 0 → earliest is lesson 0
    expect(lessons[0]!.grammarIds).toContain('g:1');
    // g:2 sentences use w:5,w:6 (lesson 1) and w:9,w:10 (lesson 2) → earliest is lesson 1
    expect(lessons[1]!.grammarIds).toContain('g:2');
  });

  it('assigns sentences to the lesson containing their latest word', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[0]!.sentenceIds).toContain('s:1'); // words w:1,w:2 → lesson 0
    expect(lessons[0]!.sentenceIds).toContain('s:2'); // words w:3,w:4 → lesson 0
    expect(lessons[1]!.sentenceIds).toContain('s:3'); // words w:5,w:6 → lesson 1
    expect(lessons[2]!.sentenceIds).toContain('s:4'); // words w:9,w:10 → lesson 2
  });

  it('handles a 6-word unit (2 lessons)', () => {
    const unit6: Unit = {
      id: 'l1-u02', level: 1, order: 2, title: 'Unit 2',
      wordIds: ['w:1','w:2','w:3','w:4','w:5','w:6'],
      grammarIds: [], sentenceIds: [],
    };
    const lessons = computeLessons(unit6, [], []);
    expect(lessons).toHaveLength(2);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[1]!.wordIds).toEqual(['w:5','w:6']);
  });

  it('handles a 4-word unit (1 lesson)', () => {
    const unit4: Unit = {
      id: 'l1-u03', level: 1, order: 3, title: 'Unit 3',
      wordIds: ['w:1','w:2','w:3','w:4'],
      grammarIds: [], sentenceIds: [],
    };
    const lessons = computeLessons(unit4, [], []);
    expect(lessons).toHaveLength(1);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[0]!.reviewWordIds).toEqual([]);
  });

  it('handles units with no grammar or sentences', () => {
    const lessons = computeLessons(unit12, [], []);
    expect(lessons).toHaveLength(3);
    expect(lessons.every(l => l.grammarIds.length === 0)).toBe(true);
    expect(lessons.every(l => l.sentenceIds.length === 0)).toBe(true);
  });
});
