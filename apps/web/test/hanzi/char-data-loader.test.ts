import { characterFileName } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { CONTENT_BASE } from '../../src/content/loader.js';

describe('charDataLoader URL', () => {
  it('builds the correct URL for a character', () => {
    const ch = '一';
    const hex = characterFileName(ch);
    expect(hex).toBe('4e00');
    expect(`${CONTENT_BASE}/characters/${hex}.json`).toBe('/content/characters/4e00.json');
  });

  it('handles multi-byte characters', () => {
    const ch = '龙';
    const hex = characterFileName(ch);
    expect(`${CONTENT_BASE}/characters/${hex}.json`).toMatch(
      /^\/content\/characters\/[0-9a-f]+\.json$/,
    );
  });
});
