import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { characterFileName } from '../ids.js';
import type { ContentBundle, ContentManifest, HskLevel, UnitChunk, Word } from '../types.js';

export function computeVersion(parts: string[]): string {
  const hash = createHash('sha256');
  for (const p of parts) hash.update(p);
  return hash.digest('hex').slice(0, 12);
}

const LEVEL_TITLES: Record<HskLevel, string> = { 1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3' };

function sortWords(words: Word[]): Word[] {
  return [...words].sort(
    (a, b) =>
      a.level - b.level ||
      a.frequency - b.frequency ||
      a.simplified.localeCompare(b.simplified, 'zh'),
  );
}

export function buildManifest(
  bundle: ContentBundle,
  version: string,
  generatedAt: string,
): ContentManifest {
  const units = [...bundle.units].sort((a, b) => a.order - b.order);
  const levels = ([1, 2, 3] as HskLevel[])
    .map((level) => ({
      level,
      title: LEVEL_TITLES[level],
      unitIds: units.filter((u) => u.level === level).map((u) => u.id),
    }))
    .filter((l) => l.unitIds.length > 0);
  return {
    version,
    generatedAt,
    levels,
    units: units.map((u) => ({
      id: u.id,
      level: u.level,
      order: u.order,
      title: u.title,
      wordCount: u.wordIds.length,
      grammarCount: u.grammarIds.length,
    })),
    counts: {
      words: bundle.words.length,
      characters: bundle.characters.length,
      grammar: bundle.grammar.length,
      sentences: bundle.sentences.length,
      units: bundle.units.length,
    },
  };
}

const json = (value: unknown) => `${JSON.stringify(value)}\n`;

export async function writeContent(
  bundle: ContentBundle,
  outDir: string,
  now: () => Date = () => new Date(),
): Promise<ContentManifest> {
  if (basename(outDir) !== 'content') {
    throw new Error(`refusing to write to ${outDir}: output directory must be named "content"`);
  }
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'units'), { recursive: true });
  await mkdir(join(outDir, 'characters'), { recursive: true });

  const files: { path: string; body: string }[] = [];
  files.push({ path: 'words.json', body: json(sortWords(bundle.words)) });

  const grammarByUnit = new Map<string, typeof bundle.grammar>();
  for (const g of bundle.grammar)
    grammarByUnit.set(g.unitId, [...(grammarByUnit.get(g.unitId) ?? []), g]);
  const sentencesByUnit = new Map<string, typeof bundle.sentences>();
  for (const s of bundle.sentences)
    sentencesByUnit.set(s.unitId, [...(sentencesByUnit.get(s.unitId) ?? []), s]);

  for (const unit of [...bundle.units].sort((a, b) => a.order - b.order)) {
    const chunk: UnitChunk = {
      unit,
      grammar: (grammarByUnit.get(unit.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
      sentences: (sentencesByUnit.get(unit.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    };
    files.push({ path: join('units', `${unit.id}.json`), body: json(chunk) });
  }
  for (const c of [...bundle.characters].sort((a, b) =>
    a.character.localeCompare(b.character, 'zh'),
  )) {
    files.push({
      path: join('characters', `${characterFileName(c.character)}.json`),
      body: json(c),
    });
  }

  const version = computeVersion(files.map((f) => `${f.path}\n${f.body}`));
  const manifest = buildManifest(bundle, version, now().toISOString());
  files.push({ path: 'manifest.json', body: json(manifest) });

  await Promise.all(files.map((f) => writeFile(join(outDir, f.path), f.body, 'utf8')));
  return manifest;
}
