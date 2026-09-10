import { speak, useHasChineseVoice } from './speech.js';

export function SpeakButton({
  text,
  label,
  size = 'sm',
}: {
  text: string;
  label?: string;
  size?: 'sm' | 'lg';
}) {
  const hasVoice = useHasChineseVoice();
  const dims = size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  return (
    <button
      type="button"
      aria-label={label ?? `Play ${text}`}
      title={hasVoice ? undefined : 'No Chinese voice installed'}
      disabled={!hasVoice}
      onClick={() => speak(text)}
      className={`inline-flex items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 disabled:opacity-40 ${dims}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'}
        fill="currentColor"
      >
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
      </svg>
    </button>
  );
}

/** Spec §8: when no Chinese voice exists, explain how to install one; audio buttons stay disabled. */
export function NoVoiceBanner() {
  const hasVoice = useHasChineseVoice();
  if (hasVoice) return null;
  return (
    <div
      role="note"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p className="font-medium">No Chinese voice is installed, so audio is disabled.</p>
      <p className="mt-1">
        Install a Mandarin (zh-CN) text-to-speech voice in your system settings (Android: Google
        Text-to-speech, Windows: Time and Language, Speech; macOS/iOS: Accessibility, Spoken
        Content), then reload this page.
      </p>
    </div>
  );
}
