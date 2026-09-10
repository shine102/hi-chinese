import { describe, expect, it, vi } from 'vitest';
import { ContentLoadError, fetchJson, loadCharacter, loadUnit } from '../../src/content/loader.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    await expect(fetchJson<{ ok: number }>('/x.json', fetchImpl)).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once after a failure and then succeeds', async () => {
    const fetchImpl = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: 2 }));
    await expect(fetchJson('/x.json', fetchImpl)).resolves.toEqual({ ok: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws a ContentLoadError with the url after two failures', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 404));
    const err = await fetchJson('/missing.json', fetchImpl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContentLoadError);
    expect((err as ContentLoadError).url).toBe('/missing.json');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates network errors after the retry', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchJson('/x.json', fetchImpl)).rejects.toThrow('Failed to fetch');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('content urls', () => {
  it('loads units and characters from the content directory', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return jsonResponse({});
    };
    await loadUnit('l1-u01', fetchImpl);
    await loadCharacter('我', fetchImpl);
    expect(urls).toEqual(['/content/units/l1-u01.json', '/content/characters/6211.json']);
  });
});
