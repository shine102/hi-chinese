import type {
  ActivityRow,
  CardKind,
  CardRow,
  FsrsState,
  SyncRequest,
  SyncResponse,
  UnitProgressRow,
  UnitStatus,
} from '@hi-chinese/content';

const SEQ_SUBQUERY = '(SELECT seq FROM sync_meta WHERE id = 1)';

const UPSERT_UNIT = `
INSERT INTO unit_progress (unit_id, status, completed_at, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(unit_id) DO UPDATE SET
  status = excluded.status,
  completed_at = excluded.completed_at,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > unit_progress.updated_at`;

const UPSERT_CARD = `
INSERT INTO cards (card_id, kind, fsrs, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(card_id) DO UPDATE SET
  kind = excluded.kind,
  fsrs = excluded.fsrs,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > cards.updated_at`;

const UPSERT_ACTIVITY = `
INSERT INTO activity (date, lessons, reviews, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(date) DO UPDATE SET
  lessons = excluded.lessons,
  reviews = excluded.reviews,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > activity.updated_at`;

interface UnitDbRow {
  unit_id: string;
  status: string;
  completed_at: number | null;
  updated_at: number;
  seq: number;
}
interface CardDbRow {
  card_id: string;
  kind: string;
  fsrs: string;
  updated_at: number;
  seq: number;
}
interface ActivityDbRow {
  date: string;
  lessons: number;
  reviews: number;
  updated_at: number;
  seq: number;
}

async function readSeq(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{ seq: number }>();
  return row?.seq ?? 0;
}

export async function applySync(db: D1Database, req: SyncRequest): Promise<SyncResponse> {
  const current = await readSeq(db);
  const cursor = req.cursor > current ? 0 : req.cursor;
  const { unitProgress, cards, activity } = req.changes;

  if (unitProgress.length + cards.length + activity.length > 0) {
    const statements: D1PreparedStatement[] = [
      db.prepare('UPDATE sync_meta SET seq = seq + 1 WHERE id = 1'),
    ];
    for (const r of unitProgress) {
      statements.push(db.prepare(UPSERT_UNIT).bind(r.unitId, r.status, r.completedAt, r.updatedAt));
    }
    for (const r of cards) {
      statements.push(
        db.prepare(UPSERT_CARD).bind(r.cardId, r.kind, JSON.stringify(r.fsrs), r.updatedAt),
      );
    }
    for (const r of activity) {
      statements.push(db.prepare(UPSERT_ACTIVITY).bind(r.date, r.lessons, r.reviews, r.updatedAt));
    }
    await db.batch(statements);
  }

  // Run the three pull SELECTs as one db.batch() rather than Promise.all(): a
  // batch executes as a single implicit transaction, so all three see the same
  // snapshot. With independent queries, a concurrent device's push could land
  // between them, and the client would compute a cursor that skips a row that
  // was already committed at the time of this pull, forever.
  const [units, cardRows, activityRows] = (await db.batch([
    db
      .prepare(
        'SELECT unit_id, status, completed_at, updated_at, seq FROM unit_progress WHERE seq > ?1 ORDER BY seq, unit_id',
      )
      .bind(cursor),
    db
      .prepare(
        'SELECT card_id, kind, fsrs, updated_at, seq FROM cards WHERE seq > ?1 ORDER BY seq, card_id',
      )
      .bind(cursor),
    db
      .prepare(
        'SELECT date, lessons, reviews, updated_at, seq FROM activity WHERE seq > ?1 ORDER BY seq, date',
      )
      .bind(cursor),
  ])) as [D1Result<UnitDbRow>, D1Result<CardDbRow>, D1Result<ActivityDbRow>];

  let maxSeq = cursor;
  for (const r of [...units.results, ...cardRows.results, ...activityRows.results]) {
    if (r.seq > maxSeq) maxSeq = r.seq;
  }

  return {
    cursor: maxSeq,
    changes: {
      unitProgress: units.results.map((r): UnitProgressRow => ({
        unitId: r.unit_id,
        status: r.status as UnitStatus,
        completedAt: r.completed_at,
        updatedAt: r.updated_at,
      })),
      cards: cardRows.results.map((r): CardRow => ({
        cardId: r.card_id,
        kind: r.kind as CardKind,
        fsrs: JSON.parse(r.fsrs) as FsrsState,
        updatedAt: r.updated_at,
      })),
      activity: activityRows.results.map((r): ActivityRow => ({
        date: r.date,
        lessons: r.lessons,
        reviews: r.reviews,
        updatedAt: r.updated_at,
      })),
    },
  };
}
