import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Test-only bindings: migrations to apply in the setup file, and the
          // passphrase the auth tests send. Never a real secret.
          // Wrangler (via this plugin) also loads apps/worker/.dev.vars when it
          // exists, but explicit `bindings` here take precedence over it, so the
          // suite always sees SYNC_PASSPHRASE = 'test-passphrase' regardless of
          // whatever a developer's local .dev.vars sets.
          bindings: { TEST_MIGRATIONS: migrations, SYNC_PASSPHRASE: 'test-passphrase' },
        },
      }),
    ],
    test: {
      include: ['test/**/*.test.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
