import { initProjectConfig } from "../../api/config/manager.ts";
import {
  deleteGitHubApiToken,
  getGitHubAuthStatus,
  setGitHubApiToken,
} from "../../api/github/auth.ts";
import {
  deleteTeamworkApiToken,
  getTeamworkAuthStatus,
  setTeamworkApiToken,
} from "../../api/teamwork/auth.ts";

/** Shared with yargs so accepted CLI providers and handler validation stay in sync. */
export const CONFIG_AUTH_PROVIDERS = ["github", "teamwork"] as const;
/** Supported auth provider names for `wtc config auth`. */
export type ConfigAuthProvider = (typeof CONFIG_AUTH_PROVIDERS)[number];

function isConfigAuthProvider(provider: string): provider is ConfigAuthProvider {
  return CONFIG_AUTH_PROVIDERS.some((value) => value === provider);
}

function requireConfigAuthProvider(provider: string): ConfigAuthProvider {
  if (isConfigAuthProvider(provider)) return provider;
  throw new Error(`Unsupported auth provider: ${provider}`);
}

/** Creates a project-level WTC config file in the current working directory. */
export async function configInit(startDir = process.cwd()): Promise<void> {
  const path = await initProjectConfig(startDir);
  console.log(`Created project config: ${path}`);
}

/** Stores an auth token for a provider in OS secrets. */
export async function configAuthSet(args: {
  provider: string;
  token: string | undefined;
}): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  if (!args.token) throw new Error(`Missing token for ${provider}.`);

  switch (provider) {
    case "github":
      await setGitHubApiToken(args.token);
      break;
    case "teamwork":
      await setTeamworkApiToken(args.token);
      break;
  }
  console.log(`Configured ${provider} auth.`);
}

/** Prints whether auth is configured for a provider (without exposing the token). */
export async function configAuthStatus(args: { provider: string }): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  const status =
    provider === "github" ? await getGitHubAuthStatus() : await getTeamworkAuthStatus();
  console.log(`${provider}: ${status}`);
}

/** Deletes stored auth for a provider. */
export async function configAuthDelete(args: { provider: string }): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  const deleted =
    provider === "github" ? await deleteGitHubApiToken() : await deleteTeamworkApiToken();
  console.log(deleted ? `Deleted ${provider} auth.` : `${provider}: missing`);
}
