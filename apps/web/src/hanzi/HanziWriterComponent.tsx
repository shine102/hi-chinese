import HanziWriter from 'hanzi-writer';
import type { CharacterJson } from 'hanzi-writer';
import { useEffect, useRef } from 'react';
import { characterFileName } from '@hi-chinese/content';
import { CONTENT_BASE } from '../content/loader.js';

export interface HanziWriterProps {
  character: string;
  mode: 'animate' | 'quiz';
  showOutline?: boolean;
  width?: number;
  height?: number;
  onQuizComplete?: (summary: { character: string; totalMistakes: number }) => void;
  onMistake?: () => void;
}

export function HanziWriterComponent({
  character,
  mode,
  showOutline = true,
  width = 200,
  height = 200,
  onQuizComplete,
  onMistake,
}: HanziWriterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const onCompleteRef = useRef(onQuizComplete);
  onCompleteRef.current = onQuizComplete;
  const onMistakeRef = useRef(onMistake);
  onMistakeRef.current = onMistake;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const writer = HanziWriter.create(el, character, {
      width,
      height,
      showOutline,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      charDataLoader: (
        char: string,
        onLoad: (d: CharacterJson) => void,
        onError: (e?: unknown) => void,
      ) => {
        const hex = characterFileName(char);
        fetch(`${CONTENT_BASE}/characters/${hex}.json`)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then((data) => onLoad(data as CharacterJson))
          .catch((err: unknown) => onError(err));
      },
    });
    writerRef.current = writer;

    if (mode === 'animate') {
      void writer.loopCharacterAnimation();
    } else {
      void writer.quiz({
        showHintAfterMisses: 3,
        onComplete: (summary) => onCompleteRef.current?.(summary),
        onMistake: () => onMistakeRef.current?.(),
      });
    }

    return () => {
      writer.cancelQuiz();
      while (el.firstChild) el.removeChild(el.firstChild);
      writerRef.current = null;
    };
  }, [character, mode, showOutline, width, height]);

  return <div ref={containerRef} data-testid={`hanzi-writer-${character}`} />;
}
