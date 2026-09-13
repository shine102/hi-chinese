import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthoredGrammar, AuthoredSentence, AuthoredUnit, UnitChunk } from '../src/types.js';

// One-off migration (Phase P0): the shipped output under apps/web/public/content
// is the source of truth for L1 (it holds the user's most recent restructure).
// This script rewrites the L1 authored inputs to faithfully match that output, so
// the pipeline reproduces the current L1 content going forward.

const here = dirname(fileURLToPath(import.meta.url));
const shippedUnitsDir = resolve(here, '../../../apps/web/public/content/units');
const authoredDir = resolve(here, '../src/authored');
const unitsOut = join(authoredDir, 'units');
const sentencesOut = join(authoredDir, 'sentences');
const grammarOut = join(authoredDir, 'grammar');

const strip = (id: string) => id.replace(/^w:/, '');

// Seven shipped L1 sentences carry wordIds that do not tokenize their zh
// (missing 有/个; one 这->这个) — a pre-existing defect that build-time
// placement validation rejects. Correct the tokenization on capture. Each list
// joins its zh exactly and every token is a course word (verified).
const WORD_FIXES: Record<string, string[]> = {
  's:l1:new:005': ['我', '家', '有', '孩子'],
  's:l1:new:012': ['我', '家', '有', '三', '个', '孩子'],
  's:l1:new:013': ['我', '有', '两', '个', '姐姐'],
  's:l1:new:014': ['他', '家', '有', '五', '个', '人'],
  's:l1:new:032': ['门口', '有', '人'],
  's:l1:new:033': ['楼上', '有', '房间'],
  's:l1:new:085': ['这', '个', '地方', '有名'],
};

const names = (await readdir(shippedUnitsDir)).filter((n) => /^l\d+-u\d+\.json$/.test(n)).sort();

const units: AuthoredUnit[] = [];
const sentences = new Map<string, AuthoredSentence>();
const grammar = new Map<string, AuthoredGrammar>();
for (const name of names) {
  const chunk = JSON.parse(await readFile(join(shippedUnitsDir, name), 'utf8')) as UnitChunk;
  const u = chunk.unit;
  if (u.level === 1) {
    units.push({ id: u.id, level: 1, order: u.order, title: u.title, words: u.wordIds.map(strip) });
  }
  // Collect L1-authored items wherever they are placed: sentences whose id is an
  // L1 id, and grammar declared at level 1. Cross-level items placed into L1
  // units stay in their own level files and are not touched here.
  for (const s of chunk.sentences) {
    if (s.id.startsWith('s:l1:') && !sentences.has(s.id)) {
      sentences.set(s.id, {
        id: s.id,
        zh: s.zh,
        pinyin: s.pinyin,
        vi: s.vi,
        words: WORD_FIXES[s.id] ?? s.wordIds.map(strip),
      });
    }
  }
  for (const g of chunk.grammar) {
    if (g.level === 1 && !grammar.has(g.id)) {
      grammar.set(g.id, {
        id: g.id,
        title: g.title,
        pattern: g.pattern,
        explanation: g.explanation,
        level: g.level,
        examples: [...g.sentenceIds],
      });
    }
  }
}
units.sort((a, b) => a.order - b.order);
const byId = <T extends { id: string }>(m: Map<string, T>) =>
  [...m.values()].sort((a, b) => a.id.localeCompare(b.id));

// Remove any leftover -captured files from earlier attempts so loadAuthored does
// not see duplicate ids.
await rm(join(sentencesOut, 'level1-captured.json'), { force: true });
await rm(join(grammarOut, 'level1-captured.json'), { force: true });

const write = (p: string, v: unknown) => writeFile(p, `${JSON.stringify(v, null, 2)}\n`, 'utf8');
await mkdir(unitsOut, { recursive: true });
await write(join(unitsOut, 'level1.json'), units);
await write(join(sentencesOut, 'level1.json'), byId(sentences));
await write(join(grammarOut, 'level1.json'), byId(grammar));
console.log(
  `units: ${units.length}; L1 sentences: ${sentences.size}; L1 grammar: ${grammar.size}`,
);
