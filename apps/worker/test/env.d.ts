declare namespace Cloudflare {
  interface Env {
    /** Injected by vitest.config.ts so the setup file can migrate the test D1. */
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
  }
}
