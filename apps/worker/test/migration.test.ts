import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('0004_multi_user migration', () => {
  it('creates a users table with the expected columns', async () => {
    const cols = await env.DB.prepare('PRAGMA table_info(users)').all<{ name: string }>();
    expect(cols.results.map((c) => c.name).sort()).toEqual(
      ['created_at', 'display_name', 'passphrase_hash', 'user_id'].sort(),
    );
  });

  it('gives unit_progress, cards, and activity a composite (user_id, *) primary key', async () => {
    const tables = [
      ['unit_progress', 'unit_id'],
      ['cards', 'card_id'],
      ['activity', 'date'],
    ] as const;
    for (const [table, secondCol] of tables) {
      const cols = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
        name: string;
        pk: number;
      }>();
      const pkCols = cols.results.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
      expect(pkCols.map((c) => c.name)).toEqual(['user_id', secondCol]);
    }
  });
});
