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
  },
});
