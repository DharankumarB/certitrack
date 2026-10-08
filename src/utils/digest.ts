const ITERATIONS = 120_000;

/** Local-only PBKDF2 verifier. Browser-stored credentials are not suitable for production auth. */
export async function digestPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SECURE_CONTEXT_REQUIRED');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const buf = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
  const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${ITERATIONS}$${saltHex}$${hex}`;
}

export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  const [algorithm, iterationsText, saltHex, expected] = digest.split('$');
  if (algorithm !== 'pbkdf2' || !iterationsText || !saltHex || !expected) return false;
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations < 10_000 || iterations > 1_000_000 || !/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{64}$/i.test(expected)) return false;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SECURE_CONTEXT_REQUIRED');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  const candidate = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
  return candidate === expected;
}
