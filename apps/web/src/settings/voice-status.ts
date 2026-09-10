/** Reports whether a Chinese speech-synthesis voice is present. Task 7 wires the live version. */
export function useHasChineseVoiceSafe(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.getVoices().some((v) => /^zh([-_]|$)/i.test(v.lang));
}
