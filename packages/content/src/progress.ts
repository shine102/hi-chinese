export type UnitStatus = 'in-progress' | 'completed';

export interface UnitProgressRow {
  unitId: string;
  status: UnitStatus;
  completedAt: number | null;
  updatedAt: number;
}

export type CardKind = 'word-recognition' | 'word-recall' | 'char-write';

export const CARD_KINDS: readonly CardKind[] = ['word-recognition', 'word-recall', 'char-write'];

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
