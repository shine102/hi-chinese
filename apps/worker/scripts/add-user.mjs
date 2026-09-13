#!/usr/bin/env node
// apps/worker/scripts/add-user.mjs
import { webcrypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Keep this hashing logic identical to apps/worker/src/crypto.ts's
// hashPassphrase — this script runs under plain Node (to shell out to
// wrangler), not the Workers runtime, so it can't import that module directly.
async function hashPassphrase(passphrase) {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(passphrase));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomPassphrase() {
  const bytes = webcrypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString('base64url');
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const { values } = parseArgs({
  options: {
    'user-id': { type: 'string' },
    name: { type: 'string' },
    remote: { type: 'boolean', default: false },
    local: { type: 'boolean', default: false },
  },
});

const userId = values['user-id'];
if (!userId || !/^[a-z0-9-]+$/.test(userId)) {
  console.error(
    'Usage: pnpm add-user -- --user-id <lowercase-id> [--name "Display Name"] (--remote | --local)',
  );
  console.error('  --user-id must match /^[a-z0-9-]+$/');
  process.exit(1);
}
if (values.remote === values.local) {
  console.error('Pass exactly one of --remote or --local.');
  process.exit(1);
}

const passphrase = randomPassphrase();
const passphraseHash = await hashPassphrase(passphrase);
const createdAt = Date.now();
const displayNameSql = values.name ? sqlString(values.name) : 'NULL';

const sql = `INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES (${sqlString(userId)}, ${sqlString(passphraseHash)}, ${displayNameSql}, ${createdAt});`;

const workerDir = fileURLToPath(new URL('..', import.meta.url));
execFileSync(
  'wrangler',
  ['d1', 'execute', 'hi-chinese', values.remote ? '--remote' : '--local', '--command', sql],
  { cwd: workerDir, stdio: 'inherit' },
);

console.log(`\nUser '${userId}' created. Passphrase (shown once — not stored anywhere, copy it now):\n`);
console.log(`  ${passphrase}\n`);
