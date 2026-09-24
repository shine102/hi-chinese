export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  meanings: string[];
}

const LINE_RE = /^(\S+) (\S+) \[([^\]]*)\] \/(.+)\/$/;

// CEDICT-family dictionaries embed classifier/measure-word annotations as one
// of the slash-delimited senses (e.g. English CEDICT uses "CL:...", CVDICT's
// Vietnamese translation of that convention uses "LT:..." or the spelled-out
// "Lượng từ: ..." for "loại từ"/"lượng từ"). CVDICT also embeds Kangxi radical
// index metadata ("Bộ Khang Hy số/thứ N") as its own slash-delimited sense, and
// sometimes inlines the classifier annotation as a parenthetical mid-sentence
// instead of as its own whole sense. All of these are bibliographic/redundant
// metadata (classifiers are covered separately by the app's own
// `Word.classifiers` field) and must not leak into `meanings`.
//
// Whole-sense filters: only strip a sense that IS ENTIRELY dictionary metadata.
// LT:/CL: is CVDICT's own unconditional abbreviation for classifier-list metadata.
const CLASSIFIER_ABBREV_RE = /^(LT|CL):/i;
// Spelled-out "lượng từ:" is ambiguous: some words genuinely mean "(as a) classifier: X"
// with plain Vietnamese senses (keep those) vs metadata listing which classifier(s)
// accompany this noun, always cited with a bracketed pinyin reading (strip those).
const CLASSIFIER_SPELLED_RE = /^lượng từ\s*:\s*[\s\S]*\[[a-z]+[1-5]?\]/i;
const KANGXI_RADICAL_RE = /^bộ\s*(thủ\s*)?khang hy\s*(số|thứ)\s*\d+\s*$/i;

function isMetadataSense(s: string): boolean {
  const t = s.trim();
  return CLASSIFIER_ABBREV_RE.test(t) || CLASSIFIER_SPELLED_RE.test(t) || KANGXI_RADICAL_RE.test(t);
}

// Inline form: the same classifier annotation embedded as a parenthetical mid-sentence,
// e.g. "núi; đồi (lượng từ: 座[zuo4])" -> "núi; đồi". Only strip a parenthetical that
// itself contains a bracketed citation (the same metadata signal as above); a parenthetical
// with no citation is ordinary descriptive text and must be left alone.
const INLINE_CLASSIFIER_RE = /\s*\((?:lượng từ|LT|CL)\s*:\s*[^()]*\[[a-z]+[1-5]?\][^()]*\)/gi;

function stripInlineMetadata(s: string): string {
  return s.replace(INLINE_CLASSIFIER_RE, '').trim();
}

export function parseCedictLine(line: string): CedictEntry | null {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return null;
  const m = LINE_RE.exec(trimmed);
  if (!m) return null;
  const [, traditional, simplified, pinyin, sensesRaw] = m;
  const meanings = sensesRaw!
    .split('/')
    .filter((s) => s.length > 0)
    .filter((s) => !isMetadataSense(s))
    .map((s) => stripInlineMetadata(s));
  return { traditional: traditional!, simplified: simplified!, pinyin: pinyin!, meanings };
}

export function parseCedict(text: string): CedictEntry[] {
  const out: CedictEntry[] = [];
  for (const line of text.split('\n')) {
    const e = parseCedictLine(line);
    if (e) out.push(e);
  }
  return out;
}

export function normalizeCedictPinyin(pinyin: string): string {
  return pinyin.replace(/u:/g, 'ü');
}

const TONE_MAP: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
};

export function pinyinSyllableToNumeric(syllable: string): string {
  for (const ch of syllable) {
    const hit = TONE_MAP[ch];
    if (hit) {
      const [base, tone] = hit;
      return syllable.replace(ch, base) + tone;
    }
  }
  return `${syllable}5`;
}

export function pinyinToNumeric(pinyin: string): string {
  return pinyin
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map(pinyinSyllableToNumeric)
    .join(' ');
}

const TONE_COMBINING = ['', '̄', '́', '̌', '̀', ''];

// Tone-marks one numbered syllable ("gou3" -> "gǒu"): the mark goes on a/e if present,
// on the o of "ou", otherwise on the last vowel.
function markSyllable(letters: string, tone: number): string {
  const base = letters.replace(/u:|v/g, 'ü').replace(/U:|V/g, 'Ü');
  if (tone === 5) return base;
  const lower = base.toLowerCase();
  let i = lower.search(/[ae]/);
  if (i < 0) i = lower.indexOf('ou');
  if (i < 0) {
    for (let j = lower.length - 1; j >= 0; j--) {
      if ('iouü'.includes(lower[j]!)) {
        i = j;
        break;
      }
    }
  }
  if (i < 0) return base;
  return (base.slice(0, i + 1) + TONE_COMBINING[tone] + base.slice(i + 1)).normalize('NFC');
}

const NUMBERED_SYLLABLE_RE = /([A-Za-z:]+?)([1-5])/g;

// "dong4 ci2" -> "dòng cí"; run-together syllables are split, erhua "r5" joins the previous
// syllable. Returns null when the text is not entirely numbered pinyin.
export function numberedToMarked(pinyin: string): string | null {
  const compact = pinyin.replace(/\s+/g, '');
  const out: string[] = [];
  let consumed = 0;
  for (const m of compact.matchAll(NUMBERED_SYLLABLE_RE)) {
    if (m.index !== consumed) return null;
    consumed += m[0].length;
    const [, letters, tone] = m;
    if (letters!.toLowerCase() === 'r' && tone === '5' && out.length > 0) out[out.length - 1] += 'r';
    else out.push(markSyllable(letters!, Number(tone)));
  }
  if (consumed !== compact.length || out.length === 0) return null;
  return out.join(' ');
}

const CEDICT_REF_RE = /(?:[\p{Script=Han}〇]+\|)?([\p{Script=Han}〇]+)?\[([^\]]*)\]/gu;

// CEDICT-style cross-references ("動詞|动词[dong4 ci2]") -> "动词 (dòng cí"); a bare
// citation ("[zhi1 dao5]") becomes just the tone-marked pinyin.
export function formatCedictRefs(text: string): string {
  return text.replace(CEDICT_REF_RE, (whole, simplified: string | undefined, pinyin: string) => {
    const marked = numberedToMarked(pinyin);
    if (marked === null) return whole;
    return simplified ? `${simplified} (${marked})` : marked;
  });
}
