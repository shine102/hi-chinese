import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The PWA virtual module only exists inside the Vite PWA plugin; tests use a stub.
      'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'test/stubs/pwa-register.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
    // @testing-library/react only registers its automatic post-test DOM cleanup when it
    // sees a global `afterEach` at import time; without this, renders from one `it()` in
    // a jsdom test file leak into the next and can make unrelated queries ambiguous.
    globals: true,
  },
});
