import type {
  AuthoredGrammar,
  AuthoredSentence,
  GrammarPoint,
  Sentence,
  Unit,
  Word,
} from '../types.js';

export interface PlacementError {
  kind:
    | 'unknown-token'
    | 'token-mismatch'
    | 'duplicate-id'
    | 'missing-sentence'
    | 'level-mismatch'
    | 'overflow'
    | 'anchor-unknown'
    | 'anchor-examples';
  ref: string;
  message: string;
}

const NON_HAN = /[^\p{Script=Han}]/gu;

export function placeSentences(
  authored: AuthoredSentence[],
  words: Word[],
  units: Unit[],
): { sentences: Sentence[]; errors: PlacementError[] } {
  const wordBySimplified = new Map(words.map((w) => [w.simplified, w]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const seen = new Set<string>();
  const sentences: Sentence[] = [];
  const errors: PlacementError[] = [];

  for (const s of authored) {
    if (seen.has(s.id)) {
      errors.push({
        kind: 'duplicate-id',
        ref: s.id,
        message: `sentence id ${s.id} appears more than once`,
      });
      continue;
    }
    seen.add(s.id);

    const unknown = s.words.filter((t) => !wordBySimplified.has(t));
    if (unknown.length > 0) {
      errors.push({
        kind: 'unknown-token',
        ref: s.id,
        message: `${s.id}: not course words: ${unknown.join(' ')}`,
      });
      continue;
    }
    const joined = s.words.join('');
    const han = s.zh.replace(NON_HAN, '');
    if (joined !== han) {
      errors.push({
        kind: 'token-mismatch',
        ref: s.id,
        message: `${s.id}: tokens "${joined}" do not spell "${han}"`,
      });
      continue;
    }

    let latest: Unit | undefined;
    const wordIds: string[] = [];
    for (const t of s.words) {
      const w = wordBySimplified.get(t)!;
      wordIds.push(w.id);
      const u = unitById.get(w.unitId);
      if (u && (!latest || u.order > latest.order)) latest = u;
    }
    if (!latest) {
      errors.push({
        kind: 'unknown-token',
        ref: s.id,
        message: `${s.id}: words are not assigned to any unit`,
      });
      continue;
    }
    sentences.push({ id: s.id, zh: s.zh, pinyin: s.pinyin, vi: s.vi, wordIds, unitId: latest.id });
  }
  return { sentences, errors };
}

export function placeGrammar(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
  maxPerUnit = 2,
): { grammar: GrammarPoint[]; errors: PlacementError[] } {
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const ordered = [...units].sort((a, b) => a.order - b.order);
  const errors: PlacementError[] = [];
  const seen = new Set<string>();

  // First pass: natural unit per grammar point.
  const pending: { point: GrammarPoint; unitIndex: number }[] = [];
  for (const g of authored) {
    if (seen.has(g.id)) {
      errors.push({
        kind: 'duplicate-id',
        ref: g.id,
        message: `grammar id ${g.id} appears more than once`,
      });
      continue;
    }
    seen.add(g.id);
    const missing = g.examples.filter((id) => !sentenceById.has(id));
    if (missing.length > 0) {
      errors.push({
        kind: 'missing-sentence',
        ref: g.id,
        message: `${g.id}: unknown example sentences: ${missing.join(', ')}`,
      });
      continue;
    }
    let latest: Unit | undefined;
    for (const id of g.examples) {
      const u = unitById.get(sentenceById.get(id)!.unitId);
      if (u && (!latest || u.order > latest.order)) latest = u;
    }
    let unitIndex = latest
      ? ordered.indexOf(latest)
      : ordered.findIndex((u) => u.level === g.level);
    const natural = ordered[unitIndex];
    if (!natural) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: no units exist for level ${g.level}`,
      });
      continue;
    }
    if (natural.level > g.level) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: declared level ${g.level} but examples need level ${natural.level} (${natural.id})`,
      });
      continue;
    }
    if (natural.level < g.level) {
      unitIndex = ordered.findIndex((u) => u.level === g.level);
      if (!ordered[unitIndex]) {
        errors.push({
          kind: 'level-mismatch',
          ref: g.id,
          message: `${g.id}: no units exist for level ${g.level}`,
        });
        continue;
      }
    }
    pending.push({
      point: {
        id: g.id,
        title: g.title,
        pattern: g.pattern,
        explanation: g.explanation,
        level: g.level,
        sentenceIds: [...g.examples],
        unitId: '',
      },
      unitIndex,
    });
  }

  // Second pass: enforce the per-unit cap, spilling forward in authored order.
  pending.sort((a, b) => a.unitIndex - b.unitIndex);
  const counts = new Map<number, number>();
  const grammar: GrammarPoint[] = [];
  for (const { point, unitIndex } of pending) {
    let i = unitIndex;
    while (
      i < ordered.length &&
      ordered[i]!.level === point.level &&
      (counts.get(i) ?? 0) >= maxPerUnit
    )
      i += 1;
    if (i >= ordered.length || ordered[i]!.level !== point.level) {
      errors.push({
        kind: 'overflow',
        ref: point.id,
        message: `${point.id}: level ${point.level} has no unit left with fewer than ${maxPerUnit} grammar points`,
      });
      continue;
    }
    counts.set(i, (counts.get(i) ?? 0) + 1);
    grammar.push({ ...point, unitId: ordered[i]!.id });
  }
  return { grammar, errors };
}

export function placeAuthoredGrammar(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
): { grammar: GrammarPoint[]; errors: PlacementError[] } {
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const errors: PlacementError[] = [];
  const seen = new Set<string>();
  const grammar: GrammarPoint[] = [];

  for (const g of authored) {
    if (seen.has(g.id)) {
      errors.push({
        kind: 'duplicate-id',
        ref: g.id,
        message: `grammar id ${g.id} appears more than once`,
      });
      continue;
    }
    seen.add(g.id);
    const missing = g.examples.filter((id) => !sentenceById.has(id));
    if (missing.length > 0) {
      errors.push({
        kind: 'missing-sentence',
        ref: g.id,
        message: `${g.id}: unknown example sentences: ${missing.join(', ')}`,
      });
      continue;
    }
    let earliest: Unit | undefined;
    for (const id of g.examples) {
      const u = unitById.get(sentenceById.get(id)!.unitId);
      if (u && (!earliest || u.order < earliest.order)) earliest = u;
    }
    if (!earliest) {
      errors.push({
        kind: 'unknown-token',
        ref: g.id,
        message: `${g.id}: examples are not placed in any unit`,
      });
      continue;
    }
    if (earliest.level !== g.level) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: declared level ${g.level} but earliest example sits in level ${earliest.level} unit ${earliest.id}`,
      });
      continue;
    }
    grammar.push({
      id: g.id,
      title: g.title,
      pattern: g.pattern,
      explanation: g.explanation,
      level: g.level,
      sentenceIds: [...g.examples],
      unitId: earliest.id,
    });
  }
  return { grammar, errors };
}

export function placeAnchoredGrammar(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
  words: Word[],
  minInUnit = 2,
): { grammar: GrammarPoint[]; errors: PlacementError[] } {
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const wordBySimplified = new Map(words.map((w) => [w.simplified, w]));
  const errors: PlacementError[] = [];
  const seen = new Set<string>();
  const grammar: GrammarPoint[] = [];

  for (const g of authored) {
    if (seen.has(g.id)) {
      errors.push({ kind: 'duplicate-id', ref: g.id, message: `grammar id ${g.id} appears more than once` });
      continue;
    }
    seen.add(g.id);
    const missing = g.examples.filter((id) => !sentenceById.has(id));
    if (missing.length > 0) {
      errors.push({
        kind: 'missing-sentence',
        ref: g.id,
        message: `${g.id}: unknown example sentences: ${missing.join(', ')}`,
      });
      continue;
    }
    const anchorWord = g.anchor === undefined ? undefined : wordBySimplified.get(g.anchor);
    const unit = anchorWord && unitById.get(anchorWord.unitId);
    if (!unit) {
      errors.push({ kind: 'anchor-unknown', ref: g.id, message: `${g.id}: anchor "${g.anchor}" is not a course word` });
      continue;
    }
    if (unit.level !== g.level) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: declared level ${g.level} but anchor "${g.anchor}" sits in level ${unit.level} unit ${unit.id}`,
      });
      continue;
    }
    const inUnit = g.examples.filter((id) => sentenceById.get(id)!.unitId === unit.id).length;
    if (inUnit < minInUnit) {
      errors.push({
        kind: 'anchor-examples',
        ref: g.id,
        message: `${g.id}: only ${inUnit} example(s) placed in anchor unit ${unit.id}, need ${minInUnit}`,
      });
      continue;
    }
    grammar.push({
      id: g.id,
      title: g.title,
      pattern: g.pattern,
      explanation: g.explanation,
      level: g.level,
      sentenceIds: [...g.examples],
      unitId: unit.id,
    });
  }
  return { grammar, errors };
}

export function attachToUnits(
  units: Unit[],
  sentences: Sentence[],
  grammar: GrammarPoint[],
): Unit[] {
  return units.map((u) => ({
    ...u,
    sentenceIds: sentences
      .filter((s) => s.unitId === u.id)
      .map((s) => s.id)
      .sort(),
    grammarIds: grammar
      .filter((g) => g.unitId === u.id)
      .map((g) => g.id)
      .sort(),
  }));
}
