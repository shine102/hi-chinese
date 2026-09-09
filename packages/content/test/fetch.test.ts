import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SOURCES, fetchRaw } from '../src/pipeline/fetch.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hi-chinese-fetch-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('fetchRaw', () => {
  it('downloads every missing source once and returns file paths', async () => {
    const calls: string[] = [];
    const download = async (url: string) => {
      calls.push(url);
      return `content of ${url}`;
    };
    const paths = await fetchRaw(dir, download, () => {});
    expect(calls.sort()).toEqual(
      Object.values(SOURCES)
        .map((s) => s.url)
        .sort(),
    );
    expect(paths.hsk).toBe(join(dir, 'complete.json'));
    expect(await readFile(paths.graphics, 'utf8')).toBe(`content of ${SOURCES.graphics.url}`);
  });

  it('skips sources whose file already exists', async () => {
    await writeFile(join(dir, 'complete.json'), '[]');
    const calls: string[] = [];
    await fetchRaw(
      dir,
      async (url) => {
        calls.push(url);
        return 'x';
      },
      () => {},
    );
    expect(calls).not.toContain(SOURCES.hsk.url);
    expect(calls).toHaveLength(2);
    expect(await readFile(join(dir, 'complete.json'), 'utf8')).toBe('[]');
  });

  it('does not leave a partial file when a download fails', async () => {
    await expect(
      fetchRaw(
        dir,
        async () => {
          throw new Error('boom');
        },
        () => {},
      ),
    ).rejects.toThrow('boom');
    await expect(readFile(join(dir, 'complete.json'), 'utf8')).rejects.toThrow();
  });
});
