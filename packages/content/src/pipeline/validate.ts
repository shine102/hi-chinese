import type { ContentBundle } from '../types.js';

export interface ValidationError {
  rule: string;
  ref: string;
  message: string;
}

export function validateContent(b: ContentBundle): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (rule: string, ref: string, message: string) => errors.push({ rule, ref, message });

  // unique-id
  const checkUnique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err('unique-id', id, `${kind} id ${id} is duplicated`);
      seen.add(id);
    }
  };
  checkUnique(
    'word',
    b.words.map((w) => w.id),
  );
  checkUnique(
    'unit',
    b.units.map((u) => u.id),
  );
  checkUnique(
    'grammar',
    b.grammar.map((g) => g.id),
  );
  checkUnique(
    'sentence',
    b.sentences.map((s) => s.id),
  );
  checkUnique(
    'character',
    b.characters.map((c) => c.character),
  );

  const wordById = new Map(b.words.map((w) => [w.id, w]));
  const unitById = new Map(b.units.map((u) => [u.id, u]));
  const sentenceById = new Map(b.sentences.map((s) => [s.id, s]));
  const grammarById = new Map(b.grammar.map((g) => [g.id, g]));
  const charSet = new Set(b.characters.map((c) => c.character));

  // words
  for (const w of b.words) {
    if (w.meanings.length === 0) err('word-meaning', w.id, `${w.simplified} has no meanings`);
    if (w.pinyin.trim() === '') err('word-pinyin', w.id, `${w.simplified} has no pinyin`);
    const u = unitById.get(w.unitId);
    if (!u) err('word-unit', w.id, `${w.simplified} has unknown unit ${w.unitId}`);
    else if (!u.wordIds.includes(w.id))
      err('word-unit', w.id, `${w.simplified} not listed in ${u.id}`);
    for (const ch of w.characters) {
      if (!charSet.has(ch))
        err('char-missing', ch, `character ${ch} (in ${w.simplified}) has no stroke data`);
    }
  }

  // units
  for (const u of b.units) {
    if (u.wordIds.length === 0) err('unit-empty', u.id, `${u.id} has no words`);
    for (const id of u.wordIds) {
      const w = wordById.get(id);
      if (!w) err('word-unit', u.id, `${u.id} lists unknown word ${id}`);
      else if (w.unitId !== u.id)
        err('word-unit', u.id, `${u.id} lists ${id} but the word belongs to ${w.unitId}`);
    }
    for (const id of u.grammarIds) {
      const g = grammarById.get(id);
      if (!g || g.unitId !== u.id)
        err('unit-refs', u.id, `${u.id} lists grammar ${id} which does not point back`);
    }
    for (const id of u.sentenceIds) {
      const s = sentenceById.get(id);
      if (!s || s.unitId !== u.id)
        err('unit-refs', u.id, `${u.id} lists sentence ${id} which does not point back`);
    }
  }

  // characters
  for (const c of b.characters) {
    if (c.strokes.length === 0 || c.medians.length !== c.strokes.length) {
      err(
        'char-strokes',
        c.character,
        `${c.character}: ${c.strokes.length} strokes, ${c.medians.length} medians`,
      );
    }
  }

  // sentences
  for (const s of b.sentences) {
    const u = unitById.get(s.unitId);
    if (!u) {
      err('sentence-order', s.id, `${s.id} has unknown unit ${s.unitId}`);
      continue;
    }
    for (const id of s.wordIds) {
      const w = wordById.get(id);
      const wu = w ? unitById.get(w.unitId) : undefined;
      if (!w || !wu) err('sentence-order', s.id, `${s.id} uses unknown word ${id}`);
      else if (wu.order > u.order)
        err(
          'sentence-order',
          s.id,
          `${s.id} in ${u.id} uses ${w.simplified} from later unit ${wu.id}`,
        );
    }
  }

  // grammar
  for (const g of b.grammar) {
    if (g.sentenceIds.length === 0) err('grammar-refs', g.id, `${g.id} has no example sentences`);
    for (const id of g.sentenceIds) {
      if (!sentenceById.has(id))
        err('grammar-refs', g.id, `${g.id} references unknown sentence ${id}`);
    }
    const u = unitById.get(g.unitId);
    if (!u) err('grammar-refs', g.id, `${g.id} has unknown unit ${g.unitId}`);
    else if (u.level !== g.level)
      err(
        'grammar-refs',
        g.id,
        `${g.id} is level ${g.level} but sits in level ${u.level} unit ${u.id}`,
      );
  }

  return errors;
}
