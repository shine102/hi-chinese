import { describe, expect, it } from 'vitest';
import { chineseVoice, speak } from '../../src/audio/speech.js';

const voice = (lang: string, name = lang) => ({ lang, name }) as unknown as SpeechSynthesisVoice;

describe('chineseVoice', () => {
  it('prefers zh-CN, then zh-Hans, then any Chinese voice', () => {
    expect(chineseVoice([voice('en-US'), voice('zh-TW'), voice('zh-CN')])?.lang).toBe('zh-CN');
    expect(chineseVoice([voice('zh-TW'), voice('zh-Hans-CN')])?.lang).toBe('zh-Hans-CN');
    expect(chineseVoice([voice('zh_TW')])?.lang).toBe('zh_TW');
    expect(chineseVoice([voice('en-GB'), voice('ja-JP')])).toBeNull();
  });
  it('accepts underscore locales but not other languages starting with zh letters', () => {
    expect(chineseVoice([voice('zhx-XX')])).toBeNull();
  });
});

describe('speak', () => {
  it('returns false when speech synthesis is unavailable', () => {
    expect(speak('你好')).toBe(false);
  });
});
