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

export interface DecryptedSecrets {
  github?: { token: string };
  teamwork?: { apiKey: string };
}

export async function initConfig(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }

  if (!existsSync(CONFIG_PATH)) {
    await writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }
}

export async function loadConfig(): Promise<Config> {
  await initConfig();

  const raw = await readFile(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  return ConfigSchema.parse(parsed);
}

export async function saveConfig(config: Config): Promise<void> {
  await initConfig();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function saveSecrets(decrypted: DecryptedSecrets, password: string): Promise<void> {
  const config = await loadConfig();
  const encryptedPayload: EncryptedPayload = encrypt(JSON.stringify(decrypted), password);

  config.encrypted = encryptedPayload;
  await saveConfig(config);
}

export async function loadSecrets(password: string): Promise<DecryptedSecrets | null> {
  const config = await loadConfig();

  if (!config.encrypted.salt) {
    return null;
  }

  const decrypted = decrypt(config.encrypted, password);
  return JSON.parse(decrypted) as DecryptedSecrets;
}
