import type { CharacterData, ContentManifest, UnitChunk, Word } from '@hi-chinese/content';
import { characterFileName } from '@hi-chinese/content';

export class ContentLoadError extends Error {
  readonly url: string;
  constructor(url: string, message: string) {
    super(`${message} (${url})`);
    this.name = 'ContentLoadError';
    this.url = url;
  }
}

export type FetchLike = (url: string) => Promise<Response>;

const defaultFetch: FetchLike = (url) => fetch(url);

/** Fetches JSON, retrying once on any failure (spec §8: retry once, then surface the error). */
export async function fetchJson<T>(url: string, fetchImpl: FetchLike = defaultFetch): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) throw new ContentLoadError(url, `HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new ContentLoadError(url, String(lastError));
}

export const CONTENT_BASE = '/content';

export function loadManifest(fetchImpl?: FetchLike): Promise<ContentManifest> {
  return fetchJson<ContentManifest>(`${CONTENT_BASE}/manifest.json`, fetchImpl);
}

export function loadWords(fetchImpl?: FetchLike): Promise<Word[]> {
  return fetchJson<Word[]>(`${CONTENT_BASE}/words.json`, fetchImpl);
}

export function loadUnit(unitId: string, fetchImpl?: FetchLike): Promise<UnitChunk> {
  return fetchJson<UnitChunk>(`${CONTENT_BASE}/units/${unitId}.json`, fetchImpl);
}

export function loadCharacter(ch: string, fetchImpl?: FetchLike): Promise<CharacterData> {
  return fetchJson<CharacterData>(
    `${CONTENT_BASE}/characters/${characterFileName(ch)}.json`,
    fetchImpl,
  );
}
