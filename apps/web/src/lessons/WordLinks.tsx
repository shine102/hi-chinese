import type { Word } from '@hi-chinese/content';
import { SpeakButton } from '../audio/SpeakButton.js';
import type { ContentIndex } from '../content/index.js';

function LearnedBadge() {
  return <span className="ml-1 rounded bg-green-100 px-1 text-xs text-green-800">đã học</span>;
}

/**
 * Association block under a word's meanings: compounds that use a single character
 * ("Gặp trong"), or the characters of a compound ("Từng chữ"). Display only — nothing here
 * is taught or tested.
 */
export function WordLinks({ word, content }: { word: Word; content: ContentIndex }) {
  const currentOrder = content.unitById.get(word.unitId)?.order ?? Number.POSITIVE_INFINITY;
  const learned = (wordId: string | undefined): boolean => {
    if (wordId === undefined) return false;
    const w = content.words.get(wordId);
    const order = w ? content.unitById.get(w.unitId)?.order : undefined;
    return order !== undefined && order < currentOrder;
  };

  if (word.associations && word.associations.length > 0) {
    return (
      <section
        aria-label="Gặp trong"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
      >
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">Gặp trong</h3>
        <ul className="mt-1 flex flex-col gap-2">
          {word.associations.map((a) => (
            <li key={a.zh} className="flex items-center gap-3">
              <span className="text-xl">{a.zh}</span>
              <div className="flex min-w-0 flex-1 flex-col text-sm leading-tight">
                <span className="text-stone-600">
                  {a.pinyin}
                  {a.hanViet && <span className="italic text-stone-500"> · {a.hanViet}</span>}
                </span>
                <span className="break-words text-stone-800">
                  {a.vi}
                  {learned(a.wordId) && <LearnedBadge />}
                </span>
              </div>
              <SpeakButton text={a.zh} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (word.parts && word.parts.length > 0) {
    return (
      <section
        aria-label="Từng chữ"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
      >
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">Từng chữ</h3>
        <ul className="mt-1 flex flex-wrap justify-center gap-2">
          {word.parts.map((p, i) => (
            <li
              key={`${p.char}-${i}`}
              className="flex min-w-16 max-w-28 flex-col items-center rounded border border-stone-200 bg-white px-2 py-1"
            >
              <span className="text-2xl">{p.char}</span>
              <span className="text-xs italic text-stone-500">{p.hanViet}</span>
              {p.gloss && <span className="break-words text-center text-xs text-stone-700">{p.gloss}</span>}
              {learned(p.wordId) && <LearnedBadge />}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}
