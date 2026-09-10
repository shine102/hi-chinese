import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './app-env.js';

const encoder = new TextEncoder();

/** Compares two strings without short-circuiting on the first differing byte. */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export function extractBearer(header: string | undefined): string | null {
  if (header === undefined) return null;
  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export const requirePassphrase = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env.SYNC_PASSPHRASE;
  if (typeof secret !== 'string' || secret.length === 0) {
    console.error('SYNC_PASSPHRASE is not configured');
    return c.json({ error: 'server not configured' }, 500);
  }
  const token = extractBearer(c.req.header('authorization'));
  if (token === null || !constantTimeEqual(token, secret)) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});
