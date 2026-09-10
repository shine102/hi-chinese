import type { ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { buildContentIndex, type ContentIndex } from './index.js';
import { loadManifest, loadUnit, loadWords } from './loader.js';

export interface ContentLoaders {
  manifest: () => Promise<ContentManifest>;
  words: () => Promise<Word[]>;
  unit: (unitId: string) => Promise<UnitChunk>;
}

export const defaultLoaders: ContentLoaders = {
  manifest: () => loadManifest(),
  words: () => loadWords(),
  unit: (unitId) => loadUnit(unitId),
};

type ContentState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; index: ContentIndex };

interface ContentContextValue {
  state: ContentState;
  retry: () => void;
  loaders: ContentLoaders;
}

const ContentContext = createContext<ContentContextValue | null>(null);

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function ContentProvider({
  loaders = defaultLoaders,
  onReady,
  children,
}: {
  loaders?: ContentLoaders;
  onReady?: (index: ContentIndex) => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<ContentState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([loaders.manifest(), loaders.words()])
      .then(([manifest, words]) => {
        if (cancelled) return;
        const index = buildContentIndex(manifest, words);
        setState({ status: 'ready', index });
        onReady?.(index);
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toError(err) });
      });
    return () => {
      cancelled = true;
    };
    // onReady is a notification callback, not an input; re-running on its identity would reload content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return (
    <ContentContext.Provider value={{ state, retry, loaders }}>{children}</ContentContext.Provider>
  );
}

function useContentContext(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('Content hooks must be used inside <ContentProvider>');
  return ctx;
}

export function ContentGate({ children }: { children: ReactNode }) {
  const { state, retry } = useContentContext();
  if (state.status === 'loading') return <Loading label="Loading course…" />;
  if (state.status === 'error')
    return (
      <InlineError message={`Could not load the course: ${state.error.message}`} onRetry={retry} />
    );
  return <>{children}</>;
}

export function useContent(): ContentIndex {
  const { state } = useContentContext();
  if (state.status !== 'ready') throw new Error('useContent called before content is ready');
  return state.index;
}

export type UnitChunkState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; chunk: UnitChunk };

type Inner =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; chunk: UnitChunk };

export function useUnitChunk(unitId: string): UnitChunkState {
  const { loaders } = useContentContext();
  const [state, setState] = useState<Inner>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loaders
      .unit(unitId)
      .then((chunk) => {
        if (!cancelled) setState({ status: 'ready', chunk });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [loaders, unitId, attempt]);

  if (state.status === 'error') return { status: 'error', error: state.error, retry };
  return state;
}
