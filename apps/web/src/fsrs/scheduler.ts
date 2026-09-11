import type { CardRow, FsrsState } from '@hi-chinese/content';
import { fsrs, type Grade, type Rating } from 'ts-fsrs';
import type { HiChineseDb } from '../db/db.js';
import { fromFsrsState, toFsrsState } from './state.js';

export const MAX_REVIEW_CARDS = 50;

const f = fsrs();

export function gradeCard(state: FsrsState, rating: Rating, now: number): FsrsState {
  const card = fromFsrsState(state);
  const result = f.repeat(card, new Date(now));
  // `Rating.Manual` has no place in a real review grade; callers only ever pass
  // Again/Hard/Good/Easy, which is exactly `Grade` (the key type `repeat` returns).
  return toFsrsState(result[rating as Grade].card);
}

export async function getDueCards(db: HiChineseDb, now: number): Promise<CardRow[]> {
  return db.cards.where('fsrs.due').belowOrEqual(now).limit(MAX_REVIEW_CARDS).toArray();
}

export async function getDueCount(db: HiChineseDb, now: number): Promise<number> {
  return db.cards.where('fsrs.due').belowOrEqual(now).count();
}
