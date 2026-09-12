import { access, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Pinned to the source repos' HEAD commits as of 2026-09-10 so a build is
// reproducible even if upstream force-pushes or rewrites main/master.
export const SOURCES = {
  hsk: {
    url: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/7ac65bf1a6387d35f1ade478906172a19311c7f9/complete.json',
    file: 'complete.json',
  },
  dictionary: {
    url: 'https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/dictionary.txt',
    file: 'dictionary.txt',
  },
  graphics: {
    url: 'https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/graphics.txt',
    file: 'graphics.txt',
  },
} as const;

export type SourceKey = keyof typeof SOURCES;

// Pinned separately from SOURCES: only the one-off Vietnamese seeding script
// (scripts/seed-vietnamese.ts) fetches this. The regular content build never
// touches CVDICT once the seed is committed to packages/content/src/authored/.
export const CVDICT_SOURCE = {
  url: 'https://raw.githubusercontent.com/ph0ngp/CVDICT/c379d909e308343a247e51619f7839a2060a271c/CVDICT.u8',
  file: 'CVDICT.u8',
} as const;

export type Downloader = (url: string) => Promise<string>;

export const defaultDownload: Downloader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function fetchRaw(
  rawDir: string,
  download?: Downloader,
  log?: (msg: string) => void,
): Promise<Record<SourceKey, string>>;
export async function fetchRaw(
  rawDir: string,
  download: Downloader | undefined,
  log: ((msg: string) => void) | undefined,
  sources: Record<string, { url: string; file: string }>,
): Promise<Record<string, string>>;
export async function fetchRaw(
  rawDir: string,
  download: Downloader = defaultDownload,
  log: (msg: string) => void = console.log,
  sources: Record<string, { url: string; file: string }> = SOURCES,
): Promise<Record<string, string>> {
  await mkdir(rawDir, { recursive: true });
  const out: Record<string, string> = {};
  for (const key of Object.keys(sources)) {
    const { url, file } = sources[key]!;
    const target = join(rawDir, file);
    out[key] = target;
    if (await exists(target)) {
      log(`cached  ${file}`);
      continue;
    }
    log(`fetch   ${url}`);
    const body = await download(url);
    const tmp = `${target}.part`;
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, target);
    log(`saved   ${file} (${(body.length / 1e6).toFixed(1)} MB)`);
  }
  return out;
}
