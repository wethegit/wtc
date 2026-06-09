import { randomBytes, createHash, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const DIGEST = "sha512";

export interface EncryptedPayload {
  salt: string;
  iv: string;
  authTag: string;
  data: string;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return Buffer.from(
    createHash(DIGEST)
      .update(Buffer.concat([Buffer.from(password, "utf-8"), salt]))
      .digest()
      .slice(0, KEY_LENGTH),
  );
}

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
