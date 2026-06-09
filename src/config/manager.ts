import { ConfigSchema } from "./schema.ts";
import type { Config } from "./schema.ts";
import { encrypt, decrypt } from "./crypto.ts";
import type { EncryptedPayload } from "./crypto.ts";

function getConfigPaths(): { configDir: string; configPath: string } {
  const homeDir = Bun.env.HOME ?? process.env.HOME ?? ".";
  const configDir = process.env.WTC_CONFIG_DIR ?? `${homeDir}/.config/wtc`;
  return { configDir, configPath: `${configDir}/config.json` };
}

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

async function promptForInitialConfig(): Promise<Config> {
  const masterPassword = prompt("WTC master password: ") ?? "";
  const githubOrg = prompt("GitHub organization: ") ?? "";
  const teamworkDomain = prompt("Teamwork domain: ") ?? "";
  const githubToken = prompt("GitHub token (optional): ") ?? "";
  const teamworkApiKey = prompt("Teamwork API key (optional): ") ?? "";

  return {
    version: 1,
    encrypted: await encrypt(
      JSON.stringify({
        github: githubToken ? { token: githubToken } : undefined,
        teamwork: teamworkApiKey ? { apiKey: teamworkApiKey } : undefined,
      }),
      masterPassword,
    ),
    plain: {
      aws: { profile: "default" },
      github: { org: githubOrg },
      teamwork: { domain: teamworkDomain },
    },
  };
}

export async function initConfig(): Promise<void> {
  const { configPath } = getConfigPaths();

  if (!(await Bun.file(configPath).exists())) {
    const shouldPrompt = process.stdin.isTTY && process.env.WTC_SKIP_CONFIG_PROMPTS !== "1";
    const config = shouldPrompt ? await promptForInitialConfig() : defaultConfig;
    await Bun.write(configPath, JSON.stringify(config, null, 2));
  }
}

export async function loadConfig(): Promise<Config> {
  await initConfig();

  const { configPath } = getConfigPaths();
  const raw = await Bun.file(configPath).text();
  const parsed = JSON.parse(raw);

  return ConfigSchema.parse(parsed);
}

export async function saveConfig(config: Config): Promise<void> {
  await initConfig();

  const { configPath } = getConfigPaths();
  await Bun.write(configPath, JSON.stringify(config, null, 2));
}

export async function saveSecrets(decrypted: DecryptedSecrets, password: string): Promise<void> {
  const config = await loadConfig();
  const encryptedPayload: EncryptedPayload = await encrypt(JSON.stringify(decrypted), password);

  config.encrypted = encryptedPayload;
  await saveConfig(config);
}

export async function loadSecrets(password: string): Promise<DecryptedSecrets | null> {
  const config = await loadConfig();

  if (!config.encrypted.salt) {
    return null;
  }

  const decrypted = await decrypt(config.encrypted, password);
  return JSON.parse(decrypted) as DecryptedSecrets;
}
