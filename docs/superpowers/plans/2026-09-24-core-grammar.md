# Core Grammar L1 + L2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 19 missing core grammar points (13 L1, 6 L2) + move `g:jianguo-experience-marker` to L1, pinned to chosen units via a new `anchor` field, and move 了/着/过/更 earlier.

**Architecture:** New optional `AuthoredGrammar.anchor` (a course word's simplified form). `placeAnchoredGrammar` places anchored points in the anchor word's unit and requires ≥2 examples placed in that unit. `assembleContent` routes anchored points (any level) there; unanchored routing unchanged. Content lives in `packages/content/src/authored/`; output regenerated with the content build.

**Tech Stack:** TypeScript, vitest, tsx, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-24-core-grammar-design.md`

## Global Constraints

- Before any pnpm command: `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`.
- Source of truth is `packages/content/src/authored/`; never hand-edit `apps/web/public/content`. Regenerate with `pnpm content:build` (from repo root). `public/content` is git-ignored but force-committed: `git add -f apps/web/public/content`.
- Commits: plain `git commit` with the global identity, **no Co-Authored-By trailer** (user's CLAUDE.md).
- Grammar `title`/`explanation` and sentence `vi` in Vietnamese; `pattern` may mix Chinese + English/Vietnamese labels like existing points.
- Each new point: 3-4 example sentences, **≥2 placed in the anchor unit** (a sentence's unit = the latest unit among its words, so each such sentence must contain at least one word of the anchor unit and otherwise only words taught earlier).
- New sentence ids: `s:l1:core:NNN` / `s:l2:core:NNN` (3-digit, from 001).
- Sentence `words` tokens must be course words and concatenate to exactly the Han characters of `zh`. `pinyin` uses tone marks and applies 不/一 sandhi like existing sentences (不是 → bú shì, 一个 → yí ge).
- Build must end with 0 placement/validate problems and 0 curriculum-order violations.
- Content is AI-authored → needs native-speaker review before external deploy; do not deploy or push.

## Review Focus

1. Moving 了/过/着 earlier re-places the existing L1 sentences that use them, which can shift the earliest-example placement of existing L1 grammar (e.g. `g:tai-le`) → the build must still pass, and no existing grammar point may end up in a unit with 0 of its examples. Pinned by the data guard in Task 6 (it also checks that every L1 grammar point has ≥1 example in its unit).
2. An anchor word that belongs to a different level than the grammar point (e.g. L2 point anchored to an L1 word) → `level-mismatch` error, not silent placement. Test in Task 1.
3. Anchored points must not consume `placeGrammar`'s per-unit cap (otherwise unanchored L2 points spill further). Test in Task 2.
4. Examples that are valid sentences but all placed outside the anchor unit → `anchor-examples` error (slide would show no examples). Test in Task 1.
5. Duplicate grammar id across anchored and unanchored sets (e.g. jianguo left in level2.json while added to level1.json) → must be reported, not silently doubled. `validateContent`'s `unique-id` rule already catches duplicate ids in the bundle; Task 5 verifies the build fails if jianguo exists in both files before deleting it.

---

### Task 1: `placeAnchoredGrammar`

**Files:**
- Modify: `packages/content/src/types.ts:121-128`
- Modify: `packages/content/src/pipeline/placement.ts`
- Test: `packages/content/test/placement.test.ts`

**Interfaces:**
- Produces: `AuthoredGrammar.anchor?: string`; `PlacementError.kind` gains `'anchor-unknown' | 'anchor-examples'`; 
  `export function placeAnchoredGrammar(authored: AuthoredGrammar[], sentences: Sentence[], units: Unit[], words: Word[], minInUnit = 2): { grammar: GrammarPoint[]; errors: PlacementError[] }`

- [ ] **Step 1: Write the failing tests** — append to `test/placement.test.ts` (reuses the file's `units`, `words`, `placed()` fixtures; add `placeAnchoredGrammar` to the import):

```ts
describe('placeAnchoredGrammar', () => {
  const g = (id: string, level: HskLevel, examples: string[], anchor: string): AuthoredGrammar => ({
    id,
    title: id,
    pattern: 'A 是 B',
    explanation: 'x',
    level,
    examples,
    anchor,
  });
  // extra sentence so l1-u02 holds two examples
  const s4: AuthoredSentence = {
    id: 's4',
    zh: '你不是学生。',
    pinyin: 'Nǐ bú shì xuéshēng.',
    vi: 'x',
    words: ['你', '不', '是', '学生'],
  };
  const placed4 = (): Sentence[] => placeSentences([s1, s2, s3, s4], words, units).sentences;

  it('places the point in the unit of its anchor word', () => {
    const { grammar, errors } = placeAnchoredGrammar([g('g1', 1, ['s1', 's2', 's4'], '学生')], placed4(), units, words);
    expect(errors).toEqual([]);
    expect(grammar).toEqual([
      {
        id: 'g1',
        title: 'g1',
        pattern: 'A 是 B',
        explanation: 'x',
        level: 1,
        sentenceIds: ['s1', 's2', 's4'],
        unitId: 'l1-u02',
      },
    ]);
  });
  it('errors when the anchor is not a course word', () => {
    const { grammar, errors } = placeAnchoredGrammar([g('g1', 1, ['s2', 's4'], '猫')], placed4(), units, words);
    expect(grammar).toEqual([]);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['anchor-unknown', 'g1']]);
  });
  it('errors when the anchor unit is in a different level', () => {
    const { errors } = placeAnchoredGrammar([g('g1', 2, ['s2', 's4'], '学生')], placed4(), units, words);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['level-mismatch', 'g1']]);
  });
  it('errors when fewer than two examples sit in the anchor unit', () => {
    const { grammar, errors } = placeAnchoredGrammar([g('g1', 1, ['s1', 's2'], '学生')], placed4(), units, words);
    expect(grammar).toEqual([]);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['anchor-examples', 'g1']]);
  });
  it('errors on missing example sentences and duplicate ids', () => {
    const { errors } = placeAnchoredGrammar(
      [g('g1', 1, ['nope'], '学生'), g('g2', 1, ['s2', 's4'], '学生'), g('g2', 1, ['s2', 's4'], '学生')],
      placed4(),
      units,
      words,
    );
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([
      ['missing-sentence', 'g1'],
      ['duplicate-id', 'g2'],
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm -F @hi-chinese/content exec vitest run test/placement.test.ts`
Expected: FAIL — `placeAnchoredGrammar` is not exported.

- [ ] **Step 3: Implement**

`types.ts` — add to `AuthoredGrammar`:

```ts
  /** Simplified form of a course word; the point is placed in that word's unit. */
  anchor?: string;
```

`placement.ts` — extend the `kind` union with `| 'anchor-unknown' | 'anchor-examples'` and add (before `attachToUnits`):

```ts
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
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm -F @hi-chinese/content exec vitest run test/placement.test.ts && pnpm -F @hi-chinese/content typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/types.ts packages/content/src/pipeline/placement.ts packages/content/test/placement.test.ts
git commit -m "feat(content): add anchor-based grammar placement"
```

---

### Task 2: Route anchored grammar in `assembleContent`

**Files:**
- Modify: `packages/content/src/pipeline/run.ts:5,39-58`
- Test: `packages/content/test/run.test.ts`

**Interfaces:**
- Consumes: `placeAnchoredGrammar` from Task 1.

- [ ] **Step 1: Write the failing tests** — append inside `describe('assembleContent', …)` in `test/run.test.ts`:

```ts
  const tinyInputs = (grammar: Authored['grammar']): RunInputs => ({
    hskJson: JSON.stringify([
      hskEntry('我', 'new-1', 'wǒ', 'wo3', 'I', 1),
      hskEntry('是', 'new-1', 'shì', 'shi4', 'to be', 2),
      hskEntry('你', 'new-2', 'nǐ', 'ni3', 'you', 3),
    ]),
    dictionaryText: ['我', '是', '你'].map(dictionaryLine).join('\n'),
    graphicsText: ['我', '是', '你'].map(graphicsLine).join('\n'),
    authored: authored({
      sentences: [
        { id: 's1', zh: '我是你。', pinyin: 'Wǒ shì nǐ.', vi: 'x', words: ['我', '是', '你'] },
        { id: 's2', zh: '你是我。', pinyin: 'Nǐ shì wǒ.', vi: 'x', words: ['你', '是', '我'] },
      ],
      grammar,
    }),
  });

  it('routes an anchored L2 point to its anchor unit', () => {
    const result = assembleContent(
      tinyInputs([
        { id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 2, examples: ['s1', 's2'], anchor: '你' },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const l2 = result.bundle.units.find((u) => u.level === 2)!;
    expect(result.bundle.grammar[0]!.unitId).toBe(l2.id);
  });

  it('does not count anchored points against the placeGrammar cap', () => {
    const plain = ['a', 'b', 'c', 'd'].map((id) => ({
      id, title: 't', pattern: 'p', explanation: 'e', level: 2 as const, examples: ['s1'],
    }));
    const result = assembleContent(
      tinyInputs([
        ...plain,
        { id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 2, examples: ['s1', 's2'], anchor: '你' },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.grammar).toHaveLength(5);
  });
```

(With a single L2 unit holding 4 unanchored points, the cap of 4 is full; if the anchored point counted against it the build would overflow.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm -F @hi-chinese/content exec vitest run test/run.test.ts`
Expected: FAIL — anchored L2 point currently goes through `placeGrammar` (first test may pass by coincidence; the cap test fails with an overflow problem).

- [ ] **Step 3: Implement** — in `run.ts` import `placeAnchoredGrammar` and replace the two grammar placement calls:

```ts
  const anchored = inputs.authored.grammar.filter((g) => g.anchor !== undefined);
  const unanchored = inputs.authored.grammar.filter((g) => g.anchor === undefined);
  // Anchored points (any level) are pinned to their anchor word's unit and must have >= 2
  // examples placed there, so the unit's grammar slide always has examples to show. They
  // bypass placeGrammar entirely and so do not consume its per-unit cap.
  const { grammar: anchoredGrammar, errors: anchoredErrors } = placeAnchoredGrammar(
    anchored,
    sentences,
    bareUnits,
    words,
  );
```

Keep the existing long comments, change `inputs.authored.grammar.filter((g) => g.level === 1)` → `unanchored.filter((g) => g.level === 1)` and `inputs.authored.grammar.filter((g) => g.level !== 1)` → `unanchored.filter((g) => g.level !== 1)`, then:

```ts
  const grammar = [...anchoredGrammar, ...authoredGrammar, ...pipelineGrammar];
  const grammarErrors = [...anchoredErrors, ...authoredGrammarErrors, ...pipelineGrammarErrors];
```

- [ ] **Step 4: Run full content tests + typecheck**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/run.ts packages/content/test/run.test.ts
git commit -m "feat(content): route anchored grammar points through placeAnchoredGrammar"
```

---

### Task 3: Move 了/着/过/更 earlier

**Files:**
- Modify: `packages/content/src/authored/units/level1.json`, `packages/content/src/authored/units/level2.json`
- Regenerated: `apps/web/public/content/**`

- [ ] **Step 1: Edit unit word lists** (no L1/L2 compound in the target units uses these chars, so append at the end):
  - `l1-u42`: remove `了`, `过`, `着` → `["图书馆","打球","开会","开玩笑","找到"]`
  - `l1-u16`: append `了`
  - `l1-u19`: append `着`
  - `l1-u27`: append `过`
  - `l2-u46`: remove `更`; `l2-u36`: append `更`

- [ ] **Step 2: Build**

Run: `pnpm content:build`
Expected: success; the printed curriculum-order warning reports 0 violations. If placement/validate problems appear (existing sentences re-placed by 了/过/着 moving), fix the offending authored sentence minimally (e.g. change its `words` or swap a word) and rebuild. Record any such fix in the commit message.

- [ ] **Step 3: Check existing grammar still has in-unit examples**

```bash
cd apps/web/public/content && python3 - <<'EOF'
import json,glob
bad=[]
for f in glob.glob('units/l1-*.json'):
    d=json.load(open(f)); sids={s['id'] for s in d['sentences']}
    bad+=[(d['unit']['id'],g['id']) for g in d['grammar'] if not sids & set(g['sentenceIds'])]
print(bad)
EOF
```
Expected: `[]`.

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/units
git add -f apps/web/public/content
git commit -m "feat(content): teach 了/着/过 and 更 earlier"
```

---

### Task 4: L1 core grammar, batch A (u04–u16)

**Files:**
- Modify: `packages/content/src/authored/grammar/level1.json`, `packages/content/src/authored/sentences/level1.json`
- Regenerated: `apps/web/public/content/**`

Points (all `level: 1`):

| id | title (vi) | pattern | anchor |
|---|---|---|---|
| `g:de-possessive` | Sở hữu với 的 | 我/你/他 + 的 + N; 我妈妈 (bỏ 的 với người thân) | 的 |
| `g:ye-dou` | Vị trí của 也 và 都 | Subject + 也/都 + verb | 们 |
| `g:ge-measure` | Lượng từ 个 | số / 这 / 那 / 哪 + 个 + noun | 这 |
| `g:he-noun` | 和 nối hai danh từ | N + 和 + N | 今天 |
| `g:a-not-a` | Câu hỏi chính phản | V不V? / 有没有? / 是不是? | 时间 |
| `g:le-change` | 了 cuối câu: thay đổi trạng thái | Sentence + 了 | 了 |

Explanation must cover: de-possessive — 的 after pronoun/noun marks possession, omitted with close relations (我妈妈, 我家); ye-dou — 也/都 go after the subject, before the verb, never before the subject, 也都 order; ge-measure — Chinese needs a measure word between number/这/那 and noun, 个 is the general one, 一个 → yí ge, 两个 not 二个; he-noun — 和 joins nouns only, not clauses (không dùng như "và" nối hai câu); a-not-a — positive + negative form makes a yes/no question, no 吗 at the end, 有 pairs with 没有; le-change — sentence-final 了 marks a new situation / change (饿了, 十岁了, 下雨了 later), contrasts with no 了 = unchanged state.

- [ ] **Step 1: List available vocabulary per anchor unit** (scratch helper, don't commit):

```bash
cd apps/web/public/content && python3 - <<'EOF'
import json
man=json.load(open('manifest.json')); words={w['id']:w for w in json.load(open('words.json'))}
order=[u for L in man['levels'] for u in L['unitIds']]
for target in ['l1-u04','l1-u07','l1-u09','l1-u11','l1-u13','l1-u16']:
    before=[];
    for u in order:
        ws=json.load(open(f'units/{u}.json'))['unit']['wordIds']
        if u==target: print(target,'ANCHOR UNIT:',' '.join(words[w]['simplified'] for w in ws)); break
        before+=ws
    print('  earlier:',' '.join(words[w]['simplified'] for w in before))
EOF
```

- [ ] **Step 2: Author sentences** — append to `sentences/level1.json` ids `s:l1:core:001`…: 3-4 per point, ≥2 containing an anchor-unit word, only using listed words. Example of the expected shape:

```json
{ "id": "s:l1:core:001", "zh": "他是我的朋友。", "pinyin": "Tā shì wǒ de péngyou.", "vi": "Anh ấy là bạn của tôi.", "words": ["他", "是", "我", "的", "朋友"] }
```

- [ ] **Step 3: Author grammar points** — append to `grammar/level1.json`, same shape as existing points plus `anchor`:

```json
{ "id": "g:de-possessive", "title": "Sở hữu với 的", "pattern": "我/你/他 + 的 + N", "explanation": "…", "level": 1, "examples": ["s:l1:core:001", "…"], "anchor": "的" }
```

- [ ] **Step 4: Build and fix until clean**

Run: `pnpm content:build`
Expected: success, 0 problems, 0 order violations. Fix `anchor-examples` by adding an anchor-unit word to a sentence; fix `unknown-token` by rewording.

- [ ] **Step 5: Verify placement**

```bash
cd apps/web/public/content && python3 -c "
import json
for u,g in [('l1-u04','g:de-possessive'),('l1-u07','g:ye-dou'),('l1-u09','g:ge-measure'),('l1-u11','g:he-noun'),('l1-u13','g:a-not-a'),('l1-u16','g:le-change')]:
    d=json.load(open(f'units/{u}.json')); print(u,g,g in d['unit']['grammarIds'])"
```
Expected: all `True`.

- [ ] **Step 6: Tests + commit**

```bash
pnpm test
git add packages/content/src/authored && git add -f apps/web/public/content
git commit -m "feat(content): add L1 core grammar (的, 也/都, 个, 和, A-not-A, 了 change)"
```

---

### Task 5: L1 core grammar, batch B (u18–u40)

**Files:** same as Task 4 plus `packages/content/src/authored/grammar/level2.json` (remove jianguo).

| id | title (vi) | pattern | anchor |
|---|---|---|---|
| `g:le-completed` | 了 sau động từ: hành động đã xong | Verb + 了 (+ object); …了吗? / 没 + verb | 看 |
| `g:xiang-want` | 想 + động từ: muốn làm gì | Subject + 想 + verb | 想 |
| `g:zhe-durative` | 着: trạng thái đang kéo dài | Verb + 着 | 着 |
| `g:cong-dao` | Từ… đến… với 从…到 | 从 + A + 到 + B | 从 |
| `g:jianguo-experience-marker` | (keep existing title) | verb + 过 | 过 |
| `g:lai-qu-direction` | Bổ ngữ xu hướng 来/去 | verb + 来/去 (回来, 出去, 进来) | 回来 |
| `g:hui-can` | 会: biết làm / sẽ | Subject + 会 + verb | 汉语 |
| `g:haishi-choice` | Câu hỏi lựa chọn với 还是 | A + 还是 + B? | 还是 |

Explanation must cover: le-completed — 了 right after the verb marks completion, question with 了吗 / 了没有, negation 没 + V with no 了; xiang-want — 想 = want/would like (softer than 要), negation 不想; zhe-durative — V着 describes an ongoing state (穿着, 站着, 放着), not an action in progress (that is 正在); cong-dao — 从 marks start, 到 end, for place and time; lai-qu — 来 toward speaker, 去 away; hui-can — 会 = learned skill (会说汉语) vs 能 = ability/circumstance, also "will likely"; haishi-choice — 还是 in questions, 或者 in statements.

- [ ] **Step 1: List vocabulary** — run the Task 4 Step 1 helper with targets `['l1-u18','l1-u19','l1-u25','l1-u27','l1-u28','l1-u32','l1-u40']`.

- [ ] **Step 2: Duplicate-id check first** — add jianguo (with `"level": 1`, `"anchor": "过"`, new L1 examples) to `grammar/level1.json` **without** removing it from `level2.json`, run `pnpm content:build`, confirm it fails reporting the duplicate id (`unique-id` or `duplicate-id`). Then delete it from `grammar/level2.json`. Its old example sentences stay in `sentences/level2.json`.

- [ ] **Step 3: Author sentences** `s:l1:core:NNN` (continue numbering) and the 7 new grammar points, same shapes as Task 4.

- [ ] **Step 4: Build and fix until clean** — `pnpm content:build`, 0 problems.

- [ ] **Step 5: Verify placement** (Task 4 Step 5 script with pairs: `l1-u18 g:le-completed`, `l1-u18 g:xiang-want`, `l1-u19 g:zhe-durative`, `l1-u25 g:cong-dao`, `l1-u27 g:jianguo-experience-marker`, `l1-u28 g:lai-qu-direction`, `l1-u32 g:hui-can`, `l1-u40 g:haishi-choice`). Expected: all `True`.

- [ ] **Step 6: Tests + commit**

```bash
pnpm test
git add packages/content/src/authored && git add -f apps/web/public/content
git commit -m "feat(content): add L1 core grammar (了 completed, 想, 着, 从…到, 过, 来/去, 会, 还是)"
```

---

### Task 6: L2 core grammar + data guard

**Files:**
- Modify: `packages/content/src/authored/grammar/level2.json`, `packages/content/src/authored/sentences/level2.json`
- Create: `packages/content/test/core-grammar-data.test.ts`
- Regenerated: `apps/web/public/content/**`

| id | title (vi) | pattern | anchor |
|---|---|---|---|
| `g:keyi-permission` | 可以: được phép / có thể | Subject + 可以 + verb; 可以…吗? | 可以 |
| `g:de-degree` | Bổ ngữ mức độ với 得 | verb + 得 + (很) adjective; (verb) + object + verb + 得 … | 得 |
| `g:yi-jiu` | Vừa… là… với 一…就 | 一 + A, 就 + B | 哭 |
| `g:shi-de` | Nhấn mạnh với 是…的 | Subject + 是 + time/place/manner/agent + verb + 的 | 带来 |
| `g:bi-extended` | So sánh mở rộng: 比…更 và 没有 | A + 比 + B + 更 + adj; A + 没有 + B + (那么) + adj | 更 |
| `g:jiu-cai` | 就 và 才: sớm hay muộn | time + 就 + verb (了) / time + 才 + verb | 才 |

Explanation must cover: keyi — permission (可以进来吗), possibility, contrast with 能/会, negation usually 不能; de-degree — comments on how an action is done, adjective usually with 很, object repeats verb (他说汉语说得很好); yi-jiu — B happens right after A; shi-de — for past events, focuses on when/where/how/who, not on whether it happened; bi-extended — 更/还 intensify, never 很 in a 比 sentence, 没有 for "not as … as"; jiu-cai — 就 = earlier/easier than expected (often with 了), 才 = later/harder (never with 了).

- [ ] **Step 1: Write the data guard (fails now)** — `test/core-grammar-data.test.ts`:

```ts
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { GrammarPoint, Sentence, Unit } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

// Core grammar added 2026-09-24 (spec 2026-09-24-core-grammar-design.md), pinned by anchor
// to these units. Guards against a future unit reshuffle silently moving or dropping them.
const CORE: Record<string, string> = {
  'g:de-possessive': 'l1-u04',
  'g:ye-dou': 'l1-u07',
  'g:ge-measure': 'l1-u09',
  'g:he-noun': 'l1-u11',
  'g:a-not-a': 'l1-u13',
  'g:le-change': 'l1-u16',
  'g:le-completed': 'l1-u18',
  'g:xiang-want': 'l1-u18',
  'g:zhe-durative': 'l1-u19',
  'g:cong-dao': 'l1-u25',
  'g:jianguo-experience-marker': 'l1-u27',
  'g:lai-qu-direction': 'l1-u28',
  'g:hui-can': 'l1-u32',
  'g:haishi-choice': 'l1-u40',
  'g:keyi-permission': 'l2-u01',
  'g:de-degree': 'l2-u01',
  'g:yi-jiu': 'l2-u05',
  'g:shi-de': 'l2-u10',
  'g:bi-extended': 'l2-u36',
  'g:jiu-cai': 'l2-u46',
};

type Chunk = { unit: Unit; grammar: GrammarPoint[]; sentences: Sentence[] };

async function loadChunks(): Promise<Chunk[]> {
  const files = (await readdir(resolve(content, 'units'))).filter((f) => f.endsWith('.json'));
  return Promise.all(files.map((f) => readJson(resolve(content, 'units', f)) as Promise<Chunk>));
}

describe('Core grammar (shipped data)', () => {
  it('places every core point in its planned unit with >= 2 in-unit examples', async () => {
    const chunks = await loadChunks();
    const problems: string[] = [];
    for (const [id, unitId] of Object.entries(CORE)) {
      const chunk = chunks.find((c) => c.unit.id === unitId);
      const g = chunk?.grammar.find((x) => x.id === id);
      if (!chunk || !g) {
        problems.push(`${id} not in ${unitId}`);
        continue;
      }
      const inUnit = new Set(chunk.sentences.map((s) => s.id));
      const n = g.sentenceIds.filter((s) => inUnit.has(s)).length;
      if (n < 2) problems.push(`${id}: ${n} in-unit examples`);
    }
    expect(problems).toEqual([]);
  });

  it('gives every L1 grammar point at least one example in its own unit', async () => {
    const chunks = await loadChunks();
    const bad = chunks
      .filter((c) => c.unit.level === 1)
      .flatMap((c) => {
        const inUnit = new Set(c.sentences.map((s) => s.id));
        return c.grammar.filter((g) => !g.sentenceIds.some((s) => inUnit.has(s))).map((g) => g.id);
      });
    expect(bad).toEqual([]);
  });
});
```

Run: `pnpm -F @hi-chinese/content exec vitest run test/core-grammar-data.test.ts`
Expected: first test FAILS listing the 6 L2 ids; second PASSES.

- [ ] **Step 2: List vocabulary** — Task 4 Step 1 helper with targets `['l2-u01','l2-u05','l2-u10','l2-u36','l2-u46']`.

- [ ] **Step 3: Author** `s:l2:core:NNN` sentences + the 6 points (`level: 2`, with `anchor`) in `level2.json` files.

- [ ] **Step 4: Build and fix until clean** — `pnpm content:build`, 0 problems.

- [ ] **Step 5: Run data guard + all tests**

Run: `pnpm -F @hi-chinese/content exec vitest run test/core-grammar-data.test.ts && pnpm test && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/authored packages/content/test/core-grammar-data.test.ts
git add -f apps/web/public/content
git commit -m "feat(content): add L2 core grammar (可以, 得, 一…就, 是…的, 比…更, 就/才) + data guard"
```

---

### Task 7: Manual check in the app

- [ ] **Step 1:** Start the web dev server (`pnpm web:dev`), enable the unlock-all-lessons toggle (commit e925a98), open `l1-u16`'s last sub-lesson.
- [ ] **Step 2:** Confirm the "了 cuối câu" grammar slide shows example sentences and a fill-blank exercise follows. Repeat for `l2-u10` (是…的).
- [ ] **Step 3:** Report results; no commit unless a fix was needed.
