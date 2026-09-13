import { defineConfig } from '@playwright/test';

// Two servers: the Worker with a throw-away local D1 (fresh every run) and the
// Vite dev server, which proxies /api to it. DEV markup attributes are required.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  // A single local `wrangler dev` + D1 backend serves every spec file; running two
  // spec files concurrently against it is flaky (dropped connections under load).
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: process.env.CHROME_PATH
          ? { executablePath: process.env.CHROME_PATH }
          : {},
      },
    },
  ],
  webServer: [
    {
      command:
        'rm -rf .wrangler/e2e && mkdir -p ../web/dist && ' +
        'pnpm exec wrangler d1 migrations apply hi-chinese --local --persist-to .wrangler/e2e && ' +
        // SHA-256 hex digest of the literal string "test-passphrase" — must stay the
        // same passphrase apps/worker/test/apply-migrations.ts seeds for the worker's
        // own Vitest suite, so the e2e specs' typed-in passphrase keeps working.
        'pnpm exec wrangler d1 execute hi-chinese --local --persist-to .wrangler/e2e --command ' +
        '"INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES (\'test-user\', \'7574f01b9ebd3b25e3640f88427260f605874ba76fefed802421d8ba9e238c93\', \'Test User\', 0)" && ' +
        'pnpm exec wrangler dev --port 8787 --persist-to .wrangler/e2e',
      cwd: '../worker',
      url: 'http://127.0.0.1:8787/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      // --host 127.0.0.1: `vite` binds only the address `localhost` resolves to on this
      // machine, which can be IPv6-only; pin it to match the IPv4 baseURL/health check.
      command: 'pnpm exec vite --port 5173 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
