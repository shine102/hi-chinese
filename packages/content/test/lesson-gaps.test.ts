import { describe, expect, it } from 'vitest';
import { lessonSentenceCounts } from '../src/pipeline/lesson-gaps.js';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `w:${i}`);

describe('lessonSentenceCounts', () => {
  it('returns one zero per lesson when there are no sentences', () => {
    expect(lessonSentenceCounts(ids(12), [])).toEqual([0, 0, 0]);
  });

  it('counts a sentence in the lesson of its latest unit word', () => {
    const counts = lessonSentenceCounts(ids(12), [
      { wordIds: ['w:0', 'w:9'] },
      { wordIds: ['w:5', 'w:1'] },
      { wordIds: ['w:3'] },
    ]);
    expect(counts).toEqual([1, 1, 1]);
  });

  it('puts a sentence with no word of the unit in lesson 0', () => {
    expect(lessonSentenceCounts(ids(8), [{ wordIds: ['w:other'] }])).toEqual([1, 0]);
  });

  it('gives a short last lesson its own slot', () => {
    expect(lessonSentenceCounts(ids(5), [{ wordIds: ['w:4'] }])).toEqual([0, 1]);
  });

  it('treats an empty unit as one lesson', () => {
    expect(lessonSentenceCounts([], [])).toEqual([0]);
  });
});
