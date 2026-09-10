import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Hi Chinese',
        short_name: 'Hi Chinese',
        description: 'Learn Mandarin Chinese, HSK 1 to 3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#b91c1c',
        background_color: '#fafaf9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell and every content chunk (about 5 MB) so the
        // whole course works offline after install. Content files change name
        // only when the content build changes them; Workbox revisions handle
        // invalidation.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // /api is live data handled by the sync outbox; never serve it from cache
        // or fall back to index.html for it.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // The Worker has no CORS handling by design; in dev, Vite proxies API calls
    // to `wrangler dev`.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
