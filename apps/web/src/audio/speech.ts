import { useSyncExternalStore } from 'react';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

const ZH = /^zh([-_]|$)/i;

/** Picks a Mandarin voice: zh-CN first, then zh-Hans, then any Chinese voice. */
export function chineseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const zh = voices.filter((v) => ZH.test(v.lang));
  return (
    zh.find((v) => /^zh[-_]CN/i.test(v.lang)) ??
    zh.find((v) => /^zh[-_]Hans/i.test(v.lang)) ??
    zh[0] ??
    null
  );
}

export function getChineseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  return s ? chineseVoice(s.getVoices()) : null;
}

/** Speaks `text` with the Chinese voice. Returns false (and does nothing) when none is available. */
export function speak(text: string): boolean {
  const s = synth();
  const voice = getChineseVoice();
  if (!s || !voice) return false;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  s.speak(utterance);
  return true;
}

/** Voices load asynchronously in most browsers; `voiceschanged` fires when the list is ready. */
export function subscribeVoices(cb: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener('voiceschanged', cb);
  return () => s.removeEventListener('voiceschanged', cb);
}

export function useHasChineseVoice(): boolean {
  return useSyncExternalStore(
    subscribeVoices,
    () => getChineseVoice() !== null,
    () => false,
  );
}
