/**
 * AES-256-GCM symmetric encryption for sensitive secrets at rest
 * (Proxmox API tokens, passwords).
 *
 * Key is derived from the AES_SECRET env var. The raw secret may be
 * either a 64-char hex string (32 bytes) or any string, in which case
 * it is hashed with SHA-256 to obtain a 32-byte key. The second form
 * is allowed for ergonomic .env values but hex is strongly recommended
 * in production.
 *
 * Storage format (base64): iv(12) | authTag(16) | ciphertext
 */

import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;    // 96 bits, recommended for GCM
const TAG_LEN = 16;   // 128 bits

function getKey(): Buffer {
  const raw = process.env.AES_SECRET;
  if (!raw) {
    throw new Error('AES_SECRET not set — required for encrypting Proxmox credentials');
  }
  // If it is a 64-char hex string, decode directly (32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  // Otherwise derive 32 bytes via SHA-256.
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

/** Encrypt a UTF-8 string. Returns base64(iv|tag|ciphertext). Empty/undefined passthrough. */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypt a base64 blob produced by encrypt(). Empty/null passthrough. */
export function decrypt(blob: string | null | undefined): string | null {
  if (blob === null || blob === undefined || blob === '') return null;
  const key = getKey();
  const buf = Buffer.from(blob, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid ciphertext: too short');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString('utf8');
}
