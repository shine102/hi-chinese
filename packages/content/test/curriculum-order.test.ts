import { describe, expect, it } from 'vitest';
import { findOrderViolations } from '../src/pipeline/curriculum-order.js';
import type { HskLevel, Unit, Word } from '../src/types.js';

const mkWord = (simplified: string, unitId: string, level: HskLevel = 1): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  hanViet: 'X',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level,
  frequency: 1,
  characters: [...simplified],
  unitId,
});

const mkUnit = (id: string, order: number, wordIds: string[]): Unit => ({
  id,
  level: 1 as HskLevel,
  order,
  title: id,
  wordIds,
  grammarIds: [],
  sentenceIds: [],
});

describe('findOrderViolations', () => {
  it('flags a compound taught in an earlier unit than its constituent char-word', () => {
    const words = [mkWord('见', 'u02'), mkWord('再见', 'u01'), mkWord('你', 'u01')];
    const units = [mkUnit('u01', 1, ['w:再见', 'w:你']), mkUnit('u02', 2, ['w:见'])];
    const violations = findOrderViolations({ words, units });
    expect(violations).toEqual([
      { word: '再见', wordId: 'w:再见', unitId: 'u01', char: '见', charWordId: 'w:见', charUnitId: 'u02' },
    ]);
  });

  it('flags a compound placed at or after its char-word within the same unit', () => {
    const words = [mkWord('再见', 'u01'), mkWord('见', 'u01')];
    const units = [mkUnit('u01', 1, ['w:再见', 'w:见'])];
    const violations = findOrderViolations({ words, units });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.char).toBe('见');
  });

  it('does not flag when the char-word already precedes the compound in the same unit', () => {
    const words = [mkWord('见', 'u01'), mkWord('再见', 'u01')];
    const units = [mkUnit('u01', 1, ['w:见', 'w:再见'])];
    expect(findOrderViolations({ words, units })).toEqual([]);
  });

  it('does not flag when the char-word is in an earlier unit', () => {
    const words = [mkWord('见', 'u01'), mkWord('再见', 'u02')];
    const units = [mkUnit('u01', 1, ['w:见']), mkUnit('u02', 2, ['w:再见'])];
    expect(findOrderViolations({ words, units })).toEqual([]);
  });

  it('ignores a constituent character that is not itself a course word', () => {
    const words = [mkWord('谢谢', 'u01')];
    const units = [mkUnit('u01', 1, ['w:谢谢'])];
    expect(findOrderViolations({ words, units })).toEqual([]);
  });

  it('counts a reduplicated character only once', () => {
    const words = [mkWord('爸爸', 'u02'), mkWord('爸', 'u03')];
    const units = [mkUnit('u02', 2, ['w:爸爸']), mkUnit('u03', 3, ['w:爸'])];
    const violations = findOrderViolations({ words, units });
    expect(violations).toHaveLength(1);
  });

  it('does not flag when the constituent char-word has a strictly higher HSK level', () => {
    const words = [mkWord('名字', 'u01', 1), mkWord('名', 'u02', 2)];
    const units = [mkUnit('u01', 1, ['w:名字']), mkUnit('u02', 2, ['w:名'])];
    expect(findOrderViolations({ words, units })).toEqual([]);
  });

  it('still flags when the constituent char-word has the same HSK level', () => {
    const words = [mkWord('名字', 'u01', 2), mkWord('名', 'u02', 2)];
    const units = [mkUnit('u01', 1, ['w:名字']), mkUnit('u02', 2, ['w:名'])];
    expect(findOrderViolations({ words, units })).toHaveLength(1);
  });
});
