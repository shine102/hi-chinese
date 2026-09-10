import Dexie, { type Table } from 'dexie';
import type { ActivityRow, CardRow, UnitProgressRow } from '@hi-chinese/content';

export type OutboxTable = 'unitProgress' | 'cards' | 'activity';

/** A local row change waiting to be pushed. `updatedAt` is the row's updatedAt at write time. */
export interface OutboxRow {
  key: string;
  table: OutboxTable;
  rowKey: string;
  updatedAt: number;
}

export type MetaKey = 'passphrase' | 'cursor' | 'contentVersion' | 'setupDone';

export interface MetaRow {
  key: MetaKey;
  value: string | number | boolean;
}

export type HiChineseDb = Dexie & {
  unitProgress: Table<UnitProgressRow, string>;
  cards: Table<CardRow, string>;
  activity: Table<ActivityRow, string>;
  outbox: Table<OutboxRow, string>;
  meta: Table<MetaRow, MetaKey>;
};

export function openDb(name = 'hi-chinese'): HiChineseDb {
  const d = new Dexie(name) as HiChineseDb;
  d.version(1).stores({
    unitProgress: 'unitId, status',
    cards: 'cardId, kind, fsrs.due',
    activity: 'date',
    outbox: 'key, table',
    meta: 'key',
  });
  return d;
}

export function outboxKey(table: OutboxTable, rowKey: string): string {
  return `${table}:${rowKey}`;
}

export function outboxEntry(table: OutboxTable, rowKey: string, updatedAt: number): OutboxRow {
  return { key: outboxKey(table, rowKey), table, rowKey, updatedAt };
}

export const db: HiChineseDb = openDb();
