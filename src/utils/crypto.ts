/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts ArrayBuffer to hexadecimal string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts hexadecimal string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random salt (16 bytes, hex encoded)
 */
export function generateSalt(): string {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  return bufferToHex(saltBytes.buffer);
}

/**
 * Generates a high-entropy session token
 */
export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  return bufferToHex(tokenBytes.buffer);
}

/**
 * Securely hashes a 6-digit PIN using PBKDF2 with SHA-256 and 10,000 iterations
 */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const saltBytes = hexToBytes(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as ArrayBufferView<ArrayBuffer>,
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  return bufferToHex(derivedBits);
}

/**
 * Performs constant-time comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies if entered PIN matches the stored PBKDF2 hash
 */
export async function verifyPin(pin: string, saltHex: string, expectedHash: string): Promise<boolean> {
  const calculatedHash = await hashPin(pin, saltHex);
  return timingSafeEqual(calculatedHash, expectedHash);
}

/**
 * Hashes a session token for secure database storage
 */
export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}
