import { initProjectConfig } from "../../api/config/manager.ts";
import type { GitHubAuthStatus } from "../../api/github/auth.ts";
import {
  deleteGitHubApiToken,
  getGitHubAuthStatus,
  setGitHubApiToken,
} from "../../api/github/auth.ts";
import type { TeamworkAuthStatus } from "../../api/teamwork/auth.ts";
import {
  deleteTeamworkApiToken,
  getTeamworkAuthStatus,
  setTeamworkApiToken,
} from "../../api/teamwork/auth.ts";

/** Shared with yargs so accepted CLI providers and handler validation stay in sync. */
export const CONFIG_AUTH_PROVIDERS = ["github", "teamwork"] as const;
/** Supported auth provider names for `wtc config auth`. */
export type ConfigAuthProvider = (typeof CONFIG_AUTH_PROVIDERS)[number];
type ConfigAuthStatus = GitHubAuthStatus | TeamworkAuthStatus;

/** Auth dependency boundary so command tests do not touch the OS secret store. */
export interface ProviderActions {
  setToken: (token: string) => Promise<void>;
  getStatus: () => Promise<ConfigAuthStatus>;
  deleteToken: () => Promise<boolean>;
}

const defaultProviderActions: Record<ConfigAuthProvider, ProviderActions> = {
  github: {
    setToken: setGitHubApiToken,
    getStatus: getGitHubAuthStatus,
    deleteToken: deleteGitHubApiToken,
  },
  teamwork: {
    setToken: setTeamworkApiToken,
    getStatus: getTeamworkAuthStatus,
    deleteToken: deleteTeamworkApiToken,
  },
};

function requireConfigAuthProvider(provider: string): ConfigAuthProvider {
  if (provider === "github" || provider === "teamwork") return provider;
  throw new Error(`Unsupported auth provider: ${provider}`);
}

/** Creates a project-level WTC config file in the current working directory. */
export async function configInit(startDir = process.cwd()): Promise<void> {
  const path = await initProjectConfig(startDir);
  console.log(`Created project config: ${path}`);
}

/** Stores an auth token for a provider in OS secrets. */
export async function configAuthSet(
  args: { provider: string; token: string | undefined },
  actions = defaultProviderActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  if (!args.token) throw new Error(`Missing token for ${provider}.`);

  await actions[provider].setToken(args.token);
  console.log(`Configured ${provider} auth.`);
}

/** Prints whether auth is configured for a provider (without exposing the token). */
export async function configAuthStatus(
  args: { provider: string },
  actions = defaultProviderActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  console.log(`${provider}: ${await actions[provider].getStatus()}`);
}

/** Deletes stored auth for a provider. */
export async function configAuthDelete(
  args: { provider: string },
  actions = defaultProviderActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  const deleted = await actions[provider].deleteToken();
  console.log(deleted ? `Deleted ${provider} auth.` : `${provider}: missing`);
}
