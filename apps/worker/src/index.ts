import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import { requirePassphrase } from './auth.js';
import { parseSyncRequest } from './sync-request.js';
import { applySync } from './sync-store.js';

const app = new Hono<AppEnv>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.use('/api/sync', requirePassphrase);

app.post('/api/sync', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }
  const parsed = parseSyncRequest(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const result = await applySync(c.env.DB, parsed.value);
  return c.json(result);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
