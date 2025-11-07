/**
 * Client-side password encryption using AES-GCM with PBKDF2 key derivation
 */

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const pw = new TextEncoder().encode(password);
  const base = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithPassword(
  password: string,
  plaintext: string
): Promise<{ salt: number[]; iv: number[]; ciphertext: number[] }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ct))
  };
}

export async function decryptWithPassword(
  password: string,
  payload: { salt: number[]; iv: number[]; ciphertext: number[] }
): Promise<string> {
  const key = await deriveKey(password, new Uint8Array(payload.salt));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.ciphertext)
  );
  return new TextDecoder().decode(pt);
}




