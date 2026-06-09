const KEY_LENGTH_BITS = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600_000;

export interface EncryptedPayload {
  salt: string;
  iv: string;
  authTag: string;
  data: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const combined = new Uint8Array(left.length + right.length);
  combined.set(left);
  combined.set(right, left.length);
  return combined;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-512",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv), tagLength: AUTH_TAG_LENGTH * 8 },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const data = encrypted.slice(0, encrypted.length - AUTH_TAG_LENGTH);
  const authTag = encrypted.slice(encrypted.length - AUTH_TAG_LENGTH);

  return {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    authTag: bytesToHex(authTag),
    data: bytesToHex(data),
  };
}

export async function decrypt(payload: EncryptedPayload, password: string): Promise<string> {
  const salt = hexToBytes(payload.salt);
  const key = await deriveKey(password, salt);
  const iv = hexToBytes(payload.iv);
  const encrypted = concatBytes(hexToBytes(payload.data), hexToBytes(payload.authTag));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    toArrayBuffer(encrypted),
  );

  return new TextDecoder().decode(decrypted);
}
