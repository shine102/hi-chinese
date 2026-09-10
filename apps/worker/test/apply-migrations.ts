import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Setup files run outside per-test storage isolation and may run more than
// once; applyD1Migrations only applies migrations not yet recorded.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
