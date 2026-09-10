import { defineConfig } from '@playwright/test';

// Two servers: the Worker with a throw-away local D1 (fresh every run) and the
// Vite dev server, which proxies /api to it. DEV markup attributes are required.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command:
        'rm -rf .wrangler/e2e && mkdir -p ../web/dist && ' +
        'pnpm exec wrangler d1 migrations apply hi-chinese --local --persist-to .wrangler/e2e && ' +
        'pnpm exec wrangler dev --port 8787 --persist-to .wrangler/e2e --var SYNC_PASSPHRASE:test-passphrase',
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
