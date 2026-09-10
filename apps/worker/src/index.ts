import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import { requirePassphrase } from './auth.js';

const app = new Hono<AppEnv>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.use('/api/sync', requirePassphrase);

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
