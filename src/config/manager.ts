/**
 *
 *
 *
 * Work in progress
 * This will manage TUI config
 *
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ConfigSchema } from "./schema.ts";
import type { Config } from "./schema.ts";
import { encrypt, decrypt } from "./crypto.ts";
import type { EncryptedPayload } from "./crypto.ts";

const CONFIG_DIR = join(homedir(), ".config", "wtc");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

/** Default config written on first run. */
const defaultConfig: Config = {
  version: 1,
  encrypted: {
    salt: "",
    iv: "",
    authTag: "",
    data: "",
  },
  plain: {
    aws: { profile: "default" },
    github: { org: "" },
    teamwork: { domain: "" },
  },
};

/** Decrypted secret values stored in the encrypted config payload. */
export interface DecryptedSecrets {
  /** GitHub personal access token or compatible API token. */
  github?: { token: string };
  /** Teamwork API key. */
  teamwork?: { apiKey: string };
}

/**
 * Ensures the WTC config directory and config file exist.
 *
 * This is safe to call before every read/write operation because it only creates
 * missing filesystem entries.
 */
export async function initConfig(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }

  if (!existsSync(CONFIG_PATH)) {
    await writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }
}

/** Loads and validates the persisted WTC config file. */
export async function loadConfig(): Promise<Config> {
  await initConfig();

  const raw = await readFile(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  return ConfigSchema.parse(parsed);
}

/** Writes a validated config object to disk. */
export async function saveConfig(config: Config): Promise<void> {
  await initConfig();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Encrypts and saves secret values into the config file.
 *
 * Non-secret `plain` config is preserved. The caller owns password collection;
 * this module only receives the password long enough to derive an encryption key.
 */
export async function saveSecrets(decrypted: DecryptedSecrets, password: string): Promise<void> {
  const config = await loadConfig();
  const encryptedPayload: EncryptedPayload = encrypt(JSON.stringify(decrypted), password);

  config.encrypted = encryptedPayload;
  await saveConfig(config);
}

/**
 * Loads and decrypts saved secret values.
 *
 * Returns `null` when no encrypted payload has been saved yet. Throws if a
 * payload exists but cannot be decrypted with the provided password.
 */
export async function loadSecrets(password: string): Promise<DecryptedSecrets | null> {
  const config = await loadConfig();

  if (!config.encrypted.salt) {
    return null;
  }

  const decrypted = decrypt(config.encrypted, password);
  return JSON.parse(decrypted) as DecryptedSecrets;
}
