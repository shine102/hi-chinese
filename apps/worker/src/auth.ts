import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './app-env.js';
import { hashPassphrase } from './crypto.js';

export function extractBearer(header: string | undefined): string | null {
  if (header === undefined) return null;
  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export const requirePassphrase = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c.req.header('authorization'));
  if (token === null) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const hash = await hashPassphrase(token);
  const row = await c.env.DB.prepare('SELECT user_id FROM users WHERE passphrase_hash = ?1')
    .bind(hash)
    .first<{ user_id: string }>();
  if (row === null) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('userId', row.user_id);
  await next();
});
