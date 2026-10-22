/**
 * AES-GCM encryption using the Web Crypto API.
 * Web Crypto helpers for optional local data encryption.
 * when the user sets a passphrase. No passphrase = no encryption.
 *
 * Key derivation: PBKDF2 (SHA-256, 200 000 iterations) → 256-bit AES-GCM key.
 * Each encrypt() call generates a random 12-byte IV prepended to the ciphertext.
 * Output format: base64(iv ‖ ciphertext)
 */

const PBKDF2_ITERATIONS = 200_000;
const KEY_LENGTH = 256;

/** Derive an AES-GCM CryptoKey from a passphrase + salt. */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encode Uint8Array → base64 string. */
function toBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

/** Decode base64 string → Uint8Array. */
function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Generate a random 16-byte salt for PBKDF2.
 * Store this alongside the encrypted data.
 */
export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Encrypt a plaintext string.
 * @returns base64(iv ‖ ciphertext)
 */
export async function encrypt(plaintext: string, passphrase: string, saltB64: string): Promise<string> {
  const salt = fromBase64(saltB64);
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return toBase64(combined);
}

/**
 * Decrypt a base64(iv ‖ ciphertext) string.
 * Throws on wrong passphrase (AES-GCM authentication failure).
 */
export async function decrypt(ciphertextB64: string, passphrase: string, saltB64: string): Promise<string> {
  const salt = fromBase64(saltB64);
  const key = await deriveKey(passphrase, salt);
  const combined = fromBase64(ciphertextB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

/** Return true if the string looks like an encrypted blob (starts with base64). */
export function isEncrypted(value: string): boolean {
  // Heuristic: encrypted blobs are much longer than typical plaintext keys/values
  // and pass a base64 check.
  try {
    const decoded = atob(value);
    return decoded.length >= 12; // at least the IV
  } catch {
    return false;
  }
}
