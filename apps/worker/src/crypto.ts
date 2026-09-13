const encoder = new TextEncoder();

/**
 * SHA-256 hex digest of a UTF-8 string, using the Workers runtime's Web
 * Crypto (`crypto.subtle`, available globally — no import needed).
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(passphrase));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
