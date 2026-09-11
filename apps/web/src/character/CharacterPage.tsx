import type { CharacterData } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { SpeakButton } from '../audio/SpeakButton.js';
import { useContent } from '../content/provider.js';
import { loadCharacter } from '../content/loader.js';
import { HanziWriterComponent } from '../hanzi/HanziWriterComponent.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function CharacterPage() {
  const { charCode } = useParams({ from: '/character/$charCode' });
  const code = parseInt(charCode, 16);
  const ch = Number.isNaN(code) ? null : String.fromCodePoint(code);
  const content = useContent();
  const [data, setData] = useState<CharacterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ch === null) return;
    let cancelled = false;
    setData(null);
    setError(null);
    loadCharacter(ch)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [ch]);

  if (ch === null) return <InlineError message="Invalid character code" />;
  if (error)
    return (
      <InlineError
        message={`Could not load character: ${error}`}
        onRetry={() => {
          setError(null);
          loadCharacter(ch)
            .then(setData)
            .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
        }}
      />
    );
  if (!data) return <Loading label={`Loading ${ch}…`} />;

  const words = data.wordIds.flatMap((wid) => {
    const w = content.words.get(wid);
    return w ? [w] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-5">
        <div className="rounded-lg border-2 border-stone-200 bg-white">
          <HanziWriterComponent character={ch} mode="animate" width={160} height={160} />
        </div>
        <div className="flex flex-col gap-1 pt-2">
          <h1 className="text-5xl">{ch}</h1>
          <div className="flex items-center gap-2">
            <span className="text-lg text-stone-600">{data.pinyin.join(', ')}</span>
            <SpeakButton text={ch} />
          </div>
          {data.definition && <p className="text-stone-800">{data.definition}</p>}
          <div className="mt-1 text-sm text-stone-500">
            <span>Radical: {data.radical}</span>
            {data.decomposition !== '？' && <span className="ml-3">Parts: {data.decomposition}</span>}
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Course words</h2>
          <ul className="flex flex-col gap-1">
            {words.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-lg">{w.simplified}</span>
                  <span className="text-sm text-stone-600">{w.pinyin}</span>
                  <span className="text-sm text-stone-500">
                    {w.meanings.slice(0, 2).join('; ')}
                  </span>
                </div>
                <SpeakButton text={w.simplified} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/" className="text-sm text-stone-500 underline">
        Back to path
      </Link>
    </div>
  );
}
