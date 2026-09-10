import {
  parseCardId,
  type ActivityRow,
  type CardRow,
  type FsrsState,
  type SyncRequest,
  type UnitProgressRow,
  type UnitStatus,
} from '@hi-chinese/content';

// Checked 2026-09-10 against https://developers.cloudflare.com/d1/platform/limits/:
// D1 documents "Maximum bound parameters per query" (100), "Maximum SQL statement
// length" (100,000 bytes), and other per-statement limits, all of which apply to
// each individual statement inside a db.batch() (see the page's "Batch limits"
// note) — but it documents no maximum on the number of statements in one batch.
// Since no such limit exists, MAX_ROWS_PER_TABLE stays at 500: applySync's write
// batch is at most 1 + 3*500 = 1501 statements (one seq bump plus up to 500 rows
// per table), and the pull batch is always exactly 3 statements (see I1).
export const MAX_ROWS_PER_TABLE = 500;

export type ParseResult = { ok: true; value: SyncRequest } | { ok: false; error: string };

class ParseError extends Error {}

function fail(path: string, message: string): never {
  throw new ParseError(`${path}: ${message}`);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Every reader takes the raw value and the full dotted path used in error messages.
function readRecord(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) fail(path, 'expected object');
  return v;
}

function readString(v: unknown, path: string, maxLen = Infinity): string {
  if (typeof v !== 'string' || v.length === 0) fail(path, 'expected non-empty string');
  if (v.length > maxLen) fail(path, `expected string of at most ${maxLen} chars`);
  return v;
}

function readInt(v: unknown, path: string, min: number): number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min)
    fail(path, `expected integer >= ${min}`);
  return v;
}

function readIntOrNull(v: unknown, path: string, min = -Infinity): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min)
    fail(
      path,
      min === -Infinity ? 'expected integer or null' : `expected integer >= ${min} or null`,
    );
  return v;
}

function readNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'expected finite number');
  return v;
}

function readNumberOrNull(v: unknown, path: string): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'expected finite number or null');
  return v;
}

function readArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, 'expected array');
  if (v.length > MAX_ROWS_PER_TABLE) fail(path, `too many rows (max ${MAX_ROWS_PER_TABLE})`);
  return v as unknown[];
}

function parseUnitProgress(v: unknown, path: string): UnitProgressRow {
  const obj = readRecord(v, path);
  const status = obj['status'];
  if (status !== 'in-progress' && status !== 'completed')
    fail(`${path}.status`, 'expected in-progress or completed');
  return {
    unitId: readString(obj['unitId'], `${path}.unitId`, 200),
    status: status as UnitStatus,
    completedAt: readIntOrNull(obj['completedAt'], `${path}.completedAt`, 0),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

function parseFsrs(v: unknown, path: string): FsrsState {
  const obj = readRecord(v, path);
  const state = obj['state'];
  if (state !== 0 && state !== 1 && state !== 2 && state !== 3)
    fail(`${path}.state`, 'expected 0-3');
  return {
    due: readNumber(obj['due'], `${path}.due`),
    stability: readNumber(obj['stability'], `${path}.stability`),
    difficulty: readNumber(obj['difficulty'], `${path}.difficulty`),
    scheduledDays: readInt(obj['scheduledDays'], `${path}.scheduledDays`, 0),
    learningSteps: readInt(obj['learningSteps'], `${path}.learningSteps`, 0),
    reps: readInt(obj['reps'], `${path}.reps`, 0),
    lapses: readInt(obj['lapses'], `${path}.lapses`, 0),
    state: state as 0 | 1 | 2 | 3,
    lastReview: readNumberOrNull(obj['lastReview'], `${path}.lastReview`),
  };
}

function parseCard(v: unknown, path: string): CardRow {
  const obj = readRecord(v, path);
  const cardId = readString(obj['cardId'], `${path}.cardId`, 200);
  const parsed = parseCardId(cardId);
  if (parsed === null) fail(`${path}.cardId`, 'malformed card id');
  if (obj['kind'] !== parsed.kind) fail(`${path}.kind`, 'does not match cardId');
  return {
    cardId,
    kind: parsed.kind,
    fsrs: parseFsrs(obj['fsrs'], `${path}.fsrs`),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseActivity(v: unknown, path: string): ActivityRow {
  const obj = readRecord(v, path);
  const date = readString(obj['date'], `${path}.date`);
  if (!DATE_RE.test(date)) fail(`${path}.date`, 'expected YYYY-MM-DD');
  // The regex accepts shapes like 2026-13-45; reject those by round-tripping
  // through Date and checking it lands back on the same calendar day (an
  // invalid month/day either yields an Invalid Date or rolls over to a
  // different date).
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    fail(`${path}.date`, 'expected a valid calendar date');
  }
  return {
    date,
    lessons: readInt(obj['lessons'], `${path}.lessons`, 0),
    reviews: readInt(obj['reviews'], `${path}.reviews`, 0),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

export function parseSyncRequest(input: unknown): ParseResult {
  try {
    const body = readRecord(input, 'body');
    const cursor = readInt(body['cursor'], 'cursor', 0);
    const changes = readRecord(body['changes'], 'changes');
    return {
      ok: true,
      value: {
        cursor,
        changes: {
          unitProgress: readArray(changes['unitProgress'], 'changes.unitProgress').map((r, i) =>
            parseUnitProgress(r, `changes.unitProgress[${i}]`),
          ),
          cards: readArray(changes['cards'], 'changes.cards').map((r, i) =>
            parseCard(r, `changes.cards[${i}]`),
          ),
          activity: readArray(changes['activity'], 'changes.activity').map((r, i) =>
            parseActivity(r, `changes.activity[${i}]`),
          ),
        },
      },
    };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.message };
    throw e;
  }
}
