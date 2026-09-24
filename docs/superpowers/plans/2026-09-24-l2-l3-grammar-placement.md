# L2/L3 Density Grammar Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every L2/L3 grammar point sits in a unit holding ≥2 of its own example sentences.

**Architecture:** New `placeGrammarByDensity` (densest same-level unit, ties → earliest, hard error below 2) replaces `placeGrammar` for unanchored L2/L3 points. Content is fixed first (delete 2 duplicate L3 points, add sentences for 26 points) while the old placer still builds, then the new placer is wired in and `placeGrammar` removed. A non-blocking build warning lists units with > 5 grammar points.

**Tech Stack:** TypeScript, vitest, tsx, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-24-l2-l3-grammar-placement-design.md`

## Global Constraints

- Before any pnpm command: `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`.
- Source of truth is `packages/content/src/authored/`; never hand-edit `apps/web/public/content`. Regenerate with `pnpm content:build` (repo root). Stage output with `git add -f apps/web/public/content`.
- Commits: plain `git commit`, **no Co-Authored-By trailer**.
- L1 placement (`placeAuthoredGrammar`) and anchored placement (`placeAnchoredGrammar`) unchanged.
- Density rule: count only examples placed in units whose `level` equals the point's `level`; pick max count; ties → smaller `order`; fewer than 2 → error kind `density-examples`.
- Crowding warning threshold: more than 5 grammar points in a unit; warning only, never fails the build.
- New sentence ids: `s:l3:fix:NNN` / `s:l2:fix:NNN` (3-digit from 001). Pinyin with tone marks, 不/一 sandhi, 个 → "ge", aspect particles and directional complements neutral (same conventions as `s:l1:core:*`). `vi` natural Vietnamese. Tokens are course words concatenating to the Han chars of `zh`.
- New content is AI-authored → native-speaker review before any deploy; do not push or deploy.

## Review Focus

1. A point whose only dense unit is in a lower level (examples use only lower-level words) must error, not silently land in the lower level → Task 1 test "ignores examples placed in other levels" + "errors when no same-level unit has two examples".
2. Tie-break must be deterministic regardless of `examples` order → Task 1 tie test lists the later unit's examples first.
3. After wiring, a future authoring change that thins a unit's examples to 1 must fail the build, not ship an example-less slide → Task 4 data guard + `density-examples` error.
4. Removing `placeGrammar` must not leave dead imports/tests or break the anchored-cap test in `run.test.ts` → Task 4 rewrites that test.
5. Content additions must make the target unit strictly the densest; a tie with an earlier unit would place the point there instead → Task 3 Step 4 check script asserts the computed unit equals the target.

---

### Task 1: `placeGrammarByDensity`

**Files:**
- Modify: `packages/content/src/pipeline/placement.ts`
- Test: `packages/content/test/placement.test.ts`

**Interfaces:**
- Produces: `PlacementError.kind` gains `'density-examples'`;
  `export function placeGrammarByDensity(authored: AuthoredGrammar[], sentences: Sentence[], units: Unit[], minInUnit = 2): { grammar: GrammarPoint[]; errors: PlacementError[] }`

- [ ] **Step 1: Write the failing tests** — append to `test/placement.test.ts` (reuses the file's `units`, `words`, `s1`, `s2`, `s3` fixtures; add `placeGrammarByDensity` to the import):

```ts
describe('placeGrammarByDensity', () => {
  const g = (id: string, level: HskLevel, examples: string[]): AuthoredGrammar => ({
    id,
    title: id,
    pattern: 'A 是 B',
    explanation: 'x',
    level,
    examples,
  });
  const extra: AuthoredSentence[] = [
    { id: 's5', zh: '我是学生。', pinyin: 'x', vi: 'x', words: ['我', '是', '学生'] }, // l1-u02
    { id: 's7', zh: '你是我。', pinyin: 'x', vi: 'x', words: ['你', '是', '我'] }, // l1-u01
    { id: 's8', zh: '老师是你。', pinyin: 'x', vi: 'x', words: ['老师', '是', '你'] }, // l2-u01
  ];
  const placedAll = (): Sentence[] => placeSentences([s1, s2, s3, ...extra], words, units).sentences;

  it('places a point in the unit holding most of its examples', () => {
    const { grammar, errors } = placeGrammarByDensity([g('g1', 1, ['s1', 's2', 's5'])], placedAll(), units);
    expect(errors).toEqual([]);
    expect(grammar).toEqual([
      {
        id: 'g1',
        title: 'g1',
        pattern: 'A 是 B',
        explanation: 'x',
        level: 1,
        sentenceIds: ['s1', 's2', 's5'],
        unitId: 'l1-u02',
      },
    ]);
  });
  it('breaks ties toward the earlier unit, whatever the example order', () => {
    const { grammar } = placeGrammarByDensity([g('g1', 1, ['s2', 's5', 's1', 's7'])], placedAll(), units);
    expect(grammar[0]!.unitId).toBe('l1-u01');
  });
  it('ignores examples placed in other levels', () => {
    const { grammar, errors } = placeGrammarByDensity([g('g1', 2, ['s1', 's7', 's3', 's8'])], placedAll(), units);
    expect(errors).toEqual([]);
    expect(grammar[0]!.unitId).toBe('l2-u01');
  });
  it('errors when no same-level unit has two examples', () => {
    const { grammar, errors } = placeGrammarByDensity(
      [g('g1', 2, ['s1', 's7']), g('g2', 1, ['s1', 's2'])],
      placedAll(),
      units,
    );
    expect(grammar).toEqual([]);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([
      ['density-examples', 'g1'],
      ['density-examples', 'g2'],
    ]);
  });
  it('errors on missing example sentences and duplicate ids', () => {
    const { errors } = placeGrammarByDensity(
      [g('g1', 1, ['nope']), g('g2', 1, ['s2', 's5']), g('g2', 1, ['s2', 's5'])],
      placedAll(),
      units,
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
Expected: FAIL — `placeGrammarByDensity` is not exported.

- [ ] **Step 3: Implement** — in `placement.ts` add `| 'density-examples'` to the `kind` union and add (after `placeAnchoredGrammar`):

```ts
export function placeGrammarByDensity(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
  minInUnit = 2,
): { grammar: GrammarPoint[]; errors: PlacementError[] } {
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const unitById = new Map(units.map((u) => [u.id, u]));
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
    const counts = new Map<string, number>();
    for (const id of g.examples) {
      const u = unitById.get(sentenceById.get(id)!.unitId);
      if (u && u.level === g.level) counts.set(u.id, (counts.get(u.id) ?? 0) + 1);
    }
    let best: Unit | undefined;
    let bestCount = 0;
    for (const [unitId, count] of counts) {
      const u = unitById.get(unitId)!;
      if (count > bestCount || (count === bestCount && best && u.order < best.order)) {
        best = u;
        bestCount = count;
      }
    }
    if (!best || bestCount < minInUnit) {
      errors.push({
        kind: 'density-examples',
        ref: g.id,
        message: `${g.id}: no level-${g.level} unit holds ${minInUnit} of its examples (best: ${best ? `${best.id} with ${bestCount}` : 'none'})`,
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
      unitId: best.id,
    });
  }
  return { grammar, errors };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm -F @hi-chinese/content exec vitest run test/placement.test.ts && pnpm -F @hi-chinese/content typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/placement.ts packages/content/test/placement.test.ts
git commit -m "feat(content): add density-based grammar placement"
```

---

### Task 2: Grammar crowding warning

**Files:**
- Create: `packages/content/src/pipeline/grammar-crowding.ts`
- Modify: `packages/content/scripts/build.ts` (after the curriculum-order warning block)
- Test: `packages/content/test/grammar-crowding.test.ts`

**Interfaces:**
- Produces: `export const MAX_GRAMMAR_PER_UNIT = 5;` and `export function findCrowdedUnits(units: Pick<Unit, 'id' | 'grammarIds'>[], max = MAX_GRAMMAR_PER_UNIT): { unitId: string; count: number }[]` (sorted by count desc, then unit id).

- [ ] **Step 1: Write the failing test** — `test/grammar-crowding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findCrowdedUnits } from '../src/pipeline/grammar-crowding.js';

const u = (id: string, n: number) => ({ id, grammarIds: Array.from({ length: n }, (_, i) => `g${i}`) });

describe('findCrowdedUnits', () => {
  it('lists units with more grammar points than the threshold, most crowded first', () => {
    expect(findCrowdedUnits([u('a', 5), u('b', 6), u('c', 8), u('d', 6)])).toEqual([
      { unitId: 'c', count: 8 },
      { unitId: 'b', count: 6 },
      { unitId: 'd', count: 6 },
    ]);
  });
  it('honours a custom threshold', () => {
    expect(findCrowdedUnits([u('a', 3), u('b', 2)], 2)).toEqual([{ unitId: 'a', count: 3 }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm -F @hi-chinese/content exec vitest run test/grammar-crowding.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/pipeline/grammar-crowding.ts`:

```ts
import type { Unit } from '../types.js';

/**
 * Units with more grammar points than this get a build warning. Density placement puts each
 * point where its examples are, so conjunction/time-themed units can collect many; that is a
 * curation signal (re-theme the units), not an error.
 */
export const MAX_GRAMMAR_PER_UNIT = 5;

export function findCrowdedUnits(
  units: Pick<Unit, 'id' | 'grammarIds'>[],
  max = MAX_GRAMMAR_PER_UNIT,
): { unitId: string; count: number }[] {
  return units
    .filter((u) => u.grammarIds.length > max)
    .map((u) => ({ unitId: u.id, count: u.grammarIds.length }))
    .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId));
}
```

In `scripts/build.ts` import `{ findCrowdedUnits, MAX_GRAMMAR_PER_UNIT }` from `'../src/pipeline/grammar-crowding.js'` and append after the curriculum-order block:

```ts
const crowded = findCrowdedUnits(result.bundle.units);
if (crowded.length > 0) {
  console.warn(`warning: ${crowded.length} unit(s) with more than ${MAX_GRAMMAR_PER_UNIT} grammar points:`);
  for (const c of crowded) console.warn(`  ${c.unitId}: ${c.count}`);
}
```

- [ ] **Step 4: Run tests + typecheck + build**

Run: `pnpm -F @hi-chinese/content exec vitest run test/grammar-crowding.test.ts && pnpm -F @hi-chinese/content typecheck && pnpm content:build`
Expected: tests PASS; build succeeds (it may print crowding lines — fine). Discard regenerated output if only `generatedAt` changed: `git checkout -- apps/web/public/content/manifest.json`.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/grammar-crowding.ts packages/content/scripts/build.ts packages/content/test/grammar-crowding.test.ts
git commit -m "feat(content): warn about units with too many grammar points"
```

---

### Task 3: Content — remove duplicates, add examples for 26 points

**Files:**
- Modify: `packages/content/src/authored/grammar/level2.json`, `packages/content/src/authored/grammar/level3.json`, `packages/content/src/authored/sentences/level2.json`, `packages/content/src/authored/sentences/level3.json`
- Regenerated: `apps/web/public/content/**`

(The old placer is still wired in this task, so the build keeps passing; Step 4's script checks the density outcome directly.)

- [ ] **Step 1: Delete duplicates** — remove `g:yi-jiu-assoonas` and `g:meiyou-comparison` from `grammar/level3.json`. Keep their sentences.

- [ ] **Step 2: Choose target units.** Rule 1 (key word is a same-level course word → its unit) is pre-resolved; rule 2 points need a choice.

| id | target unit | why |
|---|---|---|
| `g:yiwai-apart-from` (L2) | l2-u04 | 以外 taught there; has 1 example |
| `g:suo-nominalizer` | l3-u01 | 所 |
| `g:you-agent` | l3-u01 | 由 |
| `g:yinci-therefore` | l3-u02 | 因此 |
| `g:fanzheng-anyway` | l3-u03 | 反正 |
| `g:jin-only` | l3-u03 | 仅 |
| `g:shouxian-qici-zuihou` | l3-u03 | 首先 |
| `g:yifangmian-lingyifangmian` | l3-u04 | 一方面 |
| `g:jiao-comparative` | l3-u08 | 较 |
| `g:gengjia-even-more` | l3-u09 | 更加 |
| `g:jianzhi-simply` | l3-u10 | 简直 |
| `g:dayue-approximately` | l3-u10 | 大约 |
| `g:zaocheng-result-in` | l3-u14 | 造成 |
| `g:jianjue-resolutely` | l3-u41 | 坚决 |
| `g:v-kai-resultative` | l3-u01 | rule 2: earliest unit with 1 example |
| `g:v-huai-resultative` | l3-u01 | rule 2: earliest unit with 1 example |
| `g:potential-complement-xia` | l3-u08 | rule 2 |
| `g:v-zhu-resultative` | l3-u14 | rule 2 |
| `g:yue-yue-parallel` | l3-u25 | rule 2 |
| `g:v-chu-resultative` | l3-u35 | rule 2 |
| `g:potential-complement-liao` | implementer picks | rule 2, no L3 example: an L3 unit outside l3-u01..u04, fitting the pattern |
| `g:jiao-rang-passive` | implementer picks | same |
| `g:v-qilai-inchoative` | implementer picks | same |
| `g:yibian-yibian` | implementer picks | same (e.g. a leisure/daily-life unit) |
| `g:you-you-both` | implementer picks | same (e.g. a description unit) |
| `g:de-relative-clause` | implementer picks | same |

List the vocabulary available at each target (scratch helper, don't commit):

```bash
cd apps/web/public/content && python3 - <<'EOF'
import json,sys
man=json.load(open('manifest.json')); words={w['id']:w for w in json.load(open('words.json'))}
order=[u for L in man['levels'] for u in L['unitIds']]
target=sys.argv[1] if len(sys.argv)>1 else 'l3-u10'
before=[]
for u in order:
    d=json.load(open(f'units/{u}.json'))['unit']
    if u==target: print(target,d['title'],'ANCHOR UNIT:',' '.join(words[w]['simplified'] for w in d['wordIds'])); break
    before+=d['wordIds']
print('earlier L2/L3:',' '.join(words[w]['simplified'] for w in before if words[w]['level']>1))
EOF
```
(pass the unit id as argument: `python3 - l3-u10 <<'EOF' … EOF`). L1 words are all available at any L2/L3 unit.

- [ ] **Step 3: Author sentences** — for each point, add sentences `s:l3:fix:NNN` (`s:l2:fix:001` for yiwai) that each contain ≥1 word of the target unit, use only words taught by then, and clearly show the pattern; append their ids to the point's `examples`. Add enough that the target unit holds ≥2 examples **and strictly more than any other same-level unit** for that point (usually 1-2 new sentences). Don't remove existing examples. Shape:

```json
{ "id": "s:l3:fix:001", "zh": "…", "pinyin": "…", "vi": "…", "words": ["…"] }
```

- [ ] **Step 4: Build and check density outcome**

```bash
pnpm content:build
cd apps/web/public/content && python3 - <<'EOF'
import json,collections
TARGET={'g:yiwai-apart-from':'l2-u04','g:suo-nominalizer':'l3-u01','g:you-agent':'l3-u01','g:yinci-therefore':'l3-u02','g:fanzheng-anyway':'l3-u03','g:jin-only':'l3-u03','g:shouxian-qici-zuihou':'l3-u03','g:yifangmian-lingyifangmian':'l3-u04','g:jiao-comparative':'l3-u08','g:gengjia-even-more':'l3-u09','g:jianzhi-simply':'l3-u10','g:dayue-approximately':'l3-u10','g:zaocheng-result-in':'l3-u14','g:jianjue-resolutely':'l3-u41','g:v-kai-resultative':'l3-u01','g:v-huai-resultative':'l3-u01','g:potential-complement-xia':'l3-u08','g:v-zhu-resultative':'l3-u14','g:yue-yue-parallel':'l3-u25','g:v-chu-resultative':'l3-u35'}
man=json.load(open('manifest.json')); order=[u for L in man['levels'] for u in L['unitIds']]; pos={u:i for i,u in enumerate(order)}
units={u:json.load(open(f'units/{u}.json')) for u in order}
sunit={s['id']:u for u in order for s in units[u]['sentences']}
bad=[]; ids=set()
for u in order:
  for g in units[u]['grammar']:
    ids.add(g['id'])
    if g['level']==1: continue
    c=collections.Counter(sunit[s] for s in g['sentenceIds'] if units[sunit[s]]['unit']['level']==g['level'])
    if not c: bad.append((g['id'],'no same-level example')); continue
    m=max(c.values()); best=min([x for x in c if c[x]==m],key=pos.get)
    if m<2: bad.append((g['id'],f'best {best} has {m}'))
    elif g['id'] in TARGET and best!=TARGET[g['id']]: bad.append((g['id'],f'densest {best}, target {TARGET[g["id"]]}'))
print('problems:',bad)
print('duplicates gone:', not ({'g:yi-jiu-assoonas','g:meiyou-comparison'} & ids))
EOF
```
Expected: `problems: []` and `duplicates gone: True`. For the six implementer-picked points, record the chosen unit in the report.

- [ ] **Step 5: Tests + commit**

```bash
pnpm test
git add packages/content/src/authored && git add -f apps/web/public/content
git commit -m "feat(content): give every L2/L3 grammar point a unit with two examples"
```

---

### Task 4: Wire density placement, remove `placeGrammar`, data guard

**Files:**
- Modify: `packages/content/src/pipeline/run.ts`, `packages/content/src/pipeline/placement.ts`, `packages/content/test/placement.test.ts`, `packages/content/test/run.test.ts`, `packages/content/test/core-grammar-data.test.ts`
- Regenerated: `apps/web/public/content/**`

**Interfaces:**
- Consumes: `placeGrammarByDensity` (Task 1); content from Task 3.

- [ ] **Step 1: Add the failing data guard** — append to `test/core-grammar-data.test.ts` inside the existing `describe`:

```ts
  it('gives every L2/L3 grammar point at least two examples in its own unit', async () => {
    const chunks = await loadChunks();
    const bad = chunks
      .filter((c) => c.unit.level > 1)
      .flatMap((c) => {
        const inUnit = new Set(c.sentences.map((s) => s.id));
        return c.grammar
          .filter((g) => g.sentenceIds.filter((s) => inUnit.has(s)).length < 2)
          .map((g) => `${c.unit.id}:${g.id}`);
      });
    expect(bad).toEqual([]);
  });

  it('no longer ships the L3 points that duplicated L2 core grammar', async () => {
    const ids = (await loadChunks()).flatMap((c) => c.grammar.map((g) => g.id));
    expect(ids).not.toContain('g:yi-jiu-assoonas');
    expect(ids).not.toContain('g:meiyou-comparison');
  });
```

Run: `pnpm -F @hi-chinese/content exec vitest run test/core-grammar-data.test.ts`
Expected: the L2/L3 test FAILS (current output still uses the old placer); the duplicates test PASSES (Task 3).

- [ ] **Step 2: Wire it** — in `run.ts` import `placeGrammarByDensity` instead of `placeGrammar`; replace the `placeGrammar(unanchored.filter((g) => g.level !== 1), sentences, bareUnits, 4)` call with `placeGrammarByDensity(unanchored.filter((g) => g.level !== 1), sentences, bareUnits)`. Replace the "maxPerUnit raised…" comment with:

```ts
  // Levels 2/3: each unanchored point goes to the same-level unit holding the most of its
  // examples (ties -> earlier unit), and must have >= 2 there. The app only loads a unit's own
  // sentences, so this is what guarantees every grammar slide has examples and a fill-blank.
  // No per-unit cap: crowding is reported as a build warning (grammar-crowding.ts) instead.
```

Also update the older comment that mentions "`placeGrammar`'s LATEST + cap/spill + graceful under-level fallback" so it describes density placement instead, and the anchored comment's "do not consume its per-unit cap" → "are placed independently of the density placer".

- [ ] **Step 3: Remove `placeGrammar`** — delete the function from `placement.ts` and its `describe('placeGrammar', …)` block (and the `placed()` helper only if nothing else uses it) from `placement.test.ts`; drop it from the import. If the `'overflow'` error kind is now unused, remove it from the union. Rewrite the `run.test.ts` test `'does not count anchored points against the placeGrammar cap'` as:

```ts
  it('places unanchored L2 points by density alongside anchored ones', () => {
    const plain = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id, title: 't', pattern: 'p', explanation: 'e', level: 2 as const, examples: ['s1', 's2'],
    }));
    const result = assembleContent(
      tinyInputs([
        ...plain,
        { id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 2, examples: ['s1', 's2'], anchor: '你' },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const l2 = result.bundle.units.find((u) => u.level === 2)!;
    expect(result.bundle.grammar.map((g) => g.unitId)).toEqual(Array(6).fill(l2.id));
  });

  it('fails the build when an unanchored L2 point has fewer than two same-level examples', () => {
    const result = assembleContent(
      tinyInputs([{ id: 'a', title: 't', pattern: 'p', explanation: 'e', level: 2, examples: ['s1'] }]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.startsWith('[placement:density-examples]'))).toBe(true);
  });
```

- [ ] **Step 4: Build, run all tests + typecheck**

```bash
pnpm content:build
pnpm test && pnpm typecheck
```
Expected: build succeeds with 0 problems (may print the crowding warning — record its lines); all tests PASS including the new data guard.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src packages/content/test && git add -f apps/web/public/content
git commit -m "feat(content): place L2/L3 grammar by example density, drop cap/spill placer"
```
