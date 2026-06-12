import { randomBytes, createHash, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const DIGEST = "sha512";

/** Hex-encoded encrypted payload persisted inside the WTC config file. */
export interface EncryptedPayload {
  /** Random salt used to derive the encryption key. */
  salt: string;
  /** Random initialization vector used for AES-GCM. */
  iv: string;
  /** AES-GCM authentication tag used to verify ciphertext integrity. */
  authTag: string;
  /** Hex-encoded ciphertext. */
  data: string;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  // Keep derivation deterministic for decrypting existing config payloads. If
  // this changes later, add config versioning/migration before shipping it.
  return Buffer.from(
    createHash(DIGEST)
      .update(Buffer.concat([Buffer.from(password, "utf-8"), salt]))
      .digest()
      .slice(0, KEY_LENGTH),
  );
}

/**
 * Encrypts a UTF-8 string with a password-derived AES-256-GCM key.
 *
 * A fresh salt and IV are generated for every call, so encrypting the same input
 * twice should produce different payloads.
 */
export function encrypt(plaintext: string, password: string): EncryptedPayload {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf-8")), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

/**
 * Decrypts a payload produced by `encrypt()`.
 *
 * Throws when the password is wrong, the auth tag fails, or the payload is
 * malformed. Callers should surface those errors as invalid credentials rather
 * than silently returning empty secrets.
 */
export function decrypt(payload: EncryptedPayload, password: string): string {
  const salt = Buffer.from(payload.salt, "hex");
  const key = deriveKey(password, salt);
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const encrypted = Buffer.from(payload.data, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf-8");
}
