import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { hashPassphrase } from '../src/crypto.js';

// Setup files run outside per-test storage isolation and may run more than
// once; applyD1Migrations only applies migrations not yet recorded, and the
// seed inserts below are idempotent (ON CONFLICT DO NOTHING) for the same
// reason.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

async function seedUser(userId: string, passphrase: string, displayName: string): Promise<void> {
  const passphraseHash = await hashPassphrase(passphrase);
  await env.DB.prepare(
    'INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(user_id) DO NOTHING',
  )
    .bind(userId, passphraseHash, displayName, 0)
    .run();
}

await seedUser('test-user', 'test-passphrase', 'Test User');
await seedUser('test-user-2', 'test-passphrase-2', 'Test User 2');
