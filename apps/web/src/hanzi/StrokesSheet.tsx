import type { CharacterData, Word } from '@hi-chinese/content';
import { useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../content/loader.js';
import { Loading } from '../ui/Loading.js';
import { HanziWriterComponent } from './HanziWriterComponent.js';

export function StrokesSheet({ word, onClose }: { word: Word; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [chars, setChars] = useState<(CharacterData | null)[] | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(word.characters.map((ch) => loadCharacter(ch).catch(() => null))).then((data) => {
      if (!cancelled) setChars(data);
    });
    return () => {
      cancelled = true;
    };
  }, [word]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-sm rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Strokes: {word.simplified}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded p-1 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        {chars === null ? (
          <Loading label="Loading strokes…" />
        ) : (
          <div className="flex flex-col gap-5">
            {word.characters.map((ch, i) => {
              const data = chars[i];
              if (!data) return null;
              return (
                <div key={ch} className="flex items-start gap-4">
                  <HanziWriterComponent character={ch} mode="animate" width={120} height={120} />
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="text-2xl">{ch}</div>
                    <div className="text-sm text-stone-600">{data.pinyin.join(', ')}</div>
                    {data.definition && (
                      <div className="text-sm text-stone-800">{data.definition}</div>
                    )}
                    <div className="text-xs text-stone-500">Radical: {data.radical}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}
