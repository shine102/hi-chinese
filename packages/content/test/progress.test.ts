import { describe, expect, it } from 'vitest';
import { CARD_KINDS, cardId, emptyChanges, parseCardId } from '../src/progress.js';

describe('cardId / parseCardId', () => {
  it('round-trips ids whose item id contains colons', () => {
    const id = cardId('word-recognition', 'w:我');
    expect(id).toBe('word-recognition:w:我');
    expect(parseCardId(id)).toEqual({ kind: 'word-recognition', itemId: 'w:我' });
    expect(parseCardId(cardId('char-write', '你'))).toEqual({ kind: 'char-write', itemId: '你' });
  });
  it('rejects unknown kinds, missing separators and empty item ids', () => {
    expect(parseCardId('bogus:w:我')).toBeNull();
    expect(parseCardId('word-recall')).toBeNull();
    expect(parseCardId('word-recall:')).toBeNull();
    expect(parseCardId('')).toBeNull();
  });
  it('lists exactly the three card kinds', () => {
    expect([...CARD_KINDS]).toEqual(['word-recognition', 'word-recall', 'char-write']);
  });
});

describe('emptyChanges', () => {
  it('returns fresh empty arrays each call', () => {
    const a = emptyChanges();
    const b = emptyChanges();
    expect(a).toEqual({ unitProgress: [], cards: [], activity: [] });
    expect(a.cards).not.toBe(b.cards);
  });
});
