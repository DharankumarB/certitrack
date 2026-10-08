/** Prefix that marks a SHA-256 digest in stored user records. */
export const DIGEST_PREFIX = 'sha256:';

/**
 * Digests a password with SHA-256 via Web Crypto. Requires a secure context (HTTPS or localhost).
 * Passwords are never stored in plaintext. The prototype has no server, so this is a
 * demonstration of the pattern only; production must use a server-side, salted KDF.
 */
export async function digestPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SECURE_CONTEXT_REQUIRED');
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(password));
  const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  return DIGEST_PREFIX + hex;
}

export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  const candidate = await digestPassword(password);
  return candidate === digest;
}
