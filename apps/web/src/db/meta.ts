import type { HiChineseDb, MetaKey } from './db.js';

export async function getMeta<T extends string | number | boolean>(
  db: HiChineseDb,
  key: MetaKey,
): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row === undefined ? undefined : (row.value as T);
}

export async function setMeta(
  db: HiChineseDb,
  key: MetaKey,
  value: string | number | boolean,
): Promise<void> {
  await db.meta.put({ key, value });
}

export function getPassphrase(db: HiChineseDb): Promise<string | undefined> {
  return getMeta<string>(db, 'passphrase');
}

export async function getCursor(db: HiChineseDb): Promise<number> {
  return (await getMeta<number>(db, 'cursor')) ?? 0;
}

export async function isSetupDone(db: HiChineseDb): Promise<boolean> {
  return (await getMeta<boolean>(db, 'setupDone')) === true;
}
