export type UnitStatus = 'in-progress' | 'completed';

export interface UnitProgressRow {
  unitId: string;
  status: UnitStatus;
  completedAt: number | null;
  /** Sorted, deduplicated indices of the unit's sub-lessons the learner has finished. */
  completedLessons: number[];
  updatedAt: number;
}

export type CardKind = 'word-recognition' | 'word-recall' | 'char-write';

export const CARD_KINDS: readonly CardKind[] = ['word-recognition', 'word-recall', 'char-write'];

// Mirrors ts-fsrs 5.4.2's `Card` shape: due/last_review (Date there) become
// epoch-ms numbers here (due/lastReview), and stability, difficulty,
// scheduled_days (scheduledDays), learning_steps (learningSteps), reps, and
// lapses carry over as-is. `elapsed_days` is intentionally omitted: it is
// deprecated in ts-fsrs 5.x and removed entirely in 6.
export interface FsrsState {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  lastReview: number | null;
}

export interface CardRow {
  cardId: string;
  kind: CardKind;
  fsrs: FsrsState;
  updatedAt: number;
}

export interface ActivityRow {
  /** Calendar day in the learner's local time, formatted YYYY-MM-DD. */
  date: string;
  lessons: number;
  reviews: number;
  updatedAt: number;
}

export interface SyncChanges {
  unitProgress: UnitProgressRow[];
  cards: CardRow[];
  activity: ActivityRow[];
}

export interface SyncRequest {
  /** Highest server sequence number the client has already seen; 0 on first sync. */
  cursor: number;
  changes: SyncChanges;
}

export interface SyncResponse {
  cursor: number;
  changes: SyncChanges;
}

export function emptyChanges(): SyncChanges {
  return { unitProgress: [], cards: [], activity: [] };
}

export function cardId(kind: CardKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

export function parseCardId(id: string): { kind: CardKind; itemId: string } | null {
  const sep = id.indexOf(':');
  if (sep <= 0) return null;
  const kind = id.slice(0, sep);
  const itemId = id.slice(sep + 1);
  if (itemId.length === 0) return null;
  if (!(CARD_KINDS as readonly string[]).includes(kind)) return null;
  return { kind: kind as CardKind, itemId };
}
