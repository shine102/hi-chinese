import type { AuthoredUnit, HskLevel } from '../types.js';

// Building blocks for scripts/retheme-units.ts (spec 2026-09-24-l2-l3-retheme-design.md):
// subthemes → units → order → names → function-word spread → single-char order fix.

export const UNIT_TARGET = 12;

// words.json uses this frequency for words missing from the frequency list.
export const MISSING_FREQUENCY = 1_000_000;

// Mean frequency of the known words; MISSING_FREQUENCY when none is known.
export function partScore(part: readonly ThemeWord[]): number {
  const known = part.filter((w) => w.frequency < MISSING_FREQUENCY);
  if (known.length === 0) return MISSING_FREQUENCY;
  return known.reduce((sum, w) => sum + w.frequency, 0) / known.length;
}

const FUNCTION_POS = new Set(['c', 'd', 'p', 'u']);

export function isFunctionWord(pos: readonly string[]): boolean {
  return pos.some((p) => FUNCTION_POS.has(p));
}

export interface ThemeWord {
  simplified: string;
  frequency: number;
}

export interface Subtheme {
  id: string;
  broad: string;
  title: string;
}

export interface ThemesFile {
  subthemes: Subtheme[];
  words: Record<string, string>;
}

export interface DraftUnit {
  subthemeId: string;
  broad: string;
  title: string;
  words: string[];
  score: number;
}

export function chunkSubthemes(themes: ThemesFile, words: readonly ThemeWord[]): DraftUnit[] {
  const known = new Set(themes.subthemes.map((s) => s.id));
  const members = new Map<string, ThemeWord[]>();
  for (const w of words) {
    const sid = themes.words[w.simplified];
    if (sid === undefined) throw new Error(`no subtheme for ${w.simplified}`);
    if (!known.has(sid)) throw new Error(`unknown subtheme ${sid} for ${w.simplified}`);
    const list = members.get(sid) ?? [];
    list.push(w);
    members.set(sid, list);
  }

  const units: DraftUnit[] = [];
  for (const s of themes.subthemes) {
    const list = [...(members.get(s.id) ?? [])].sort((a, b) => a.frequency - b.frequency);
    if (list.length === 0) continue;
    const n = Math.max(1, Math.round(list.length / UNIT_TARGET));
    for (let i = 0; i < n; i++) {
      const part = list.slice(
        Math.floor((i * list.length) / n),
        Math.floor(((i + 1) * list.length) / n),
      );
      units.push({
        subthemeId: s.id,
        broad: s.broad,
        title: s.title,
        words: part.map((w) => w.simplified),
        score: partScore(part),
      });
    }
  }
  return units;
}

// Greedy by score, skipping the previous unit's broad theme. When one broad theme holds
// more than half of what is left, it must be taken now (if allowed) or the tail can only
// be that theme back to back.
export function orderUnits(units: readonly DraftUnit[]): DraftUnit[] {
  const left = [...units].sort((a, b) => a.score - b.score);
  const out: DraftUnit[] = [];
  while (left.length > 0) {
    const prev = out[out.length - 1]?.broad;
    const counts = new Map<string, number>();
    for (const u of left) counts.set(u.broad, (counts.get(u.broad) ?? 0) + 1);
    const [dominant, dominantCount] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
    let i: number;
    if (dominant !== prev && dominantCount * 2 > left.length) {
      i = left.findIndex((u) => u.broad === dominant);
    } else {
      i = left.findIndex((u) => u.broad !== prev);
      if (i < 0) i = 0;
    }
    out.push(left.splice(i, 1)[0]!);
  }
  return out;
}

export function nameUnits(units: readonly DraftUnit[]): DraftUnit[] {
  const total = new Map<string, number>();
  for (const u of units) total.set(u.subthemeId, (total.get(u.subthemeId) ?? 0) + 1);
  const seen = new Map<string, number>();
  return units.map((u) => {
    if (total.get(u.subthemeId) === 1) return u;
    const k = (seen.get(u.subthemeId) ?? 0) + 1;
    seen.set(u.subthemeId, k);
    return { ...u, title: `${u.title} ${k}` };
  });
}

export function spreadFunctionWords(
  units: readonly DraftUnit[],
  fnWords: readonly ThemeWord[],
  pins: Readonly<Record<string, number>> = {},
): DraftUnit[] {
  const pinned = new Set(Object.keys(pins));
  const allWords = new Set<string>();
  for (const u of units) for (const w of u.words) allWords.add(w);
  for (const w of fnWords) allWords.add(w.simplified);

  const out = units.map((u) => ({ ...u, words: u.words.filter((w) => !pinned.has(w)) }));
  const spread = fnWords
    .filter((w) => !pinned.has(w.simplified))
    .sort((a, b) => a.frequency - b.frequency);
  spread.forEach((w, i) => {
    out[Math.floor((i * out.length) / spread.length)]!.words.push(w.simplified);
  });
  for (const [word, k] of Object.entries(pins)) {
    if (!allWords.has(word)) throw new Error(`pin ${word}: not a word of this level`);
    const unit = out[k - 1];
    if (!unit) throw new Error(`pin ${word} → unit ${k} out of range (1..${out.length})`);
    unit.words.push(word);
  }
  return out;
}

export interface WordInfo {
  level: HskLevel;
  characters: readonly string[];
}

// Single pass in teaching order: before each compound, pull in any of its single-char
// course words not yet taught (same or lower level, not frozen) from wherever they sit.
export function fixCharOrder(
  units: readonly AuthoredUnit[],
  info: ReadonlyMap<string, WordInfo>,
  frozenLevels: ReadonlySet<HskLevel>,
): AuthoredUnit[] {
  const out = units.map((u) => ({ ...u, words: [...u.words] }));
  const taught = new Set<string>();
  for (const u of out) {
    for (let i = 0; i < u.words.length; i++) {
      const word = u.words[i]!;
      const wi = info.get(word);
      if (!wi) throw new Error(`fixCharOrder: no info for ${word}`);
      for (const ch of new Set(wi.characters)) {
        if (ch === word || taught.has(ch)) continue;
        const ci = info.get(ch);
        if (!ci || ci.level > wi.level || frozenLevels.has(ci.level)) continue;
        for (const v of out) {
          const j = v.words.indexOf(ch);
          if (j >= 0) v.words.splice(j, 1);
        }
        u.words.splice(i, 0, ch);
        taught.add(ch);
        i++;
      }
      taught.add(word);
    }
  }
  return out;
}
