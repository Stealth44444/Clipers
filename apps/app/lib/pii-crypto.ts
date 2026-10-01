import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Resident registration numbers are encrypted here, on the app server, before they reach the database
// (개인정보보호법 제24조의2). AES-256-GCM with PAYOUT_ENCRYPTION_KEY (32 random bytes, base64), which lives only in
// the server's environment. Stored form: "v1:" + base64(iv | auth tag | ciphertext).

const VERSION = 'v1';

function key(): Buffer | null {
  const encoded = process.env.PAYOUT_ENCRYPTION_KEY;
  if (!encoded) return null;
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.length === 32 ? bytes : null;
}

export function piiEncryptionReady(): boolean {
  return key() !== null;
}

export function encryptPii(plain: string): string {
  const secret = key();
  if (!secret) throw new Error('PAYOUT_ENCRYPTION_KEY is missing or not 32 bytes');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')}`;
}

export function decryptPii(stored: string): string {
  const secret = key();
  if (!secret) throw new Error('PAYOUT_ENCRYPTION_KEY is missing or not 32 bytes');
  const [version, payload] = stored.split(':');
  if (version !== VERSION || !payload) throw new Error('Unknown encrypted value format');
  const bytes = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}
