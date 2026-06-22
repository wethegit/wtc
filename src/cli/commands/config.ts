import { initProjectConfig } from "../../config/manager.ts";
import {
  deleteTeamworkApiToken,
  getTeamworkAuthStatus,
  setTeamworkApiToken,
  type TeamworkAuthStatus,
} from "../../teamwork/auth.ts";

/** Shared with yargs so accepted CLI providers and handler validation stay in sync. */
export const CONFIG_AUTH_PROVIDERS = ["teamwork"] as const;
/** Supported auth provider names for `wtc config auth`. */
export type ConfigAuthProvider = (typeof CONFIG_AUTH_PROVIDERS)[number];

/** Auth dependency boundary so command tests do not touch the OS secret store. */
interface ConfigAuthActions {
  setTeamworkApiToken: (token: string) => Promise<void>;
  getTeamworkAuthStatus: () => Promise<TeamworkAuthStatus>;
  deleteTeamworkApiToken: () => Promise<boolean>;
}

const teamworkAuthActions: ConfigAuthActions = {
  setTeamworkApiToken,
  getTeamworkAuthStatus,
  deleteTeamworkApiToken,
};

function requireConfigAuthProvider(provider: string): ConfigAuthProvider {
  if (provider === "teamwork") return provider;
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
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  if (!args.token) throw new Error(`Missing token for ${provider}.`);

  await actions.setTeamworkApiToken(args.token);
  console.log(`Configured ${provider} auth.`);
}

/** Prints whether auth is configured for a provider (without exposing the token). */
export async function configAuthStatus(
  args: { provider: string },
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  console.log(`${provider}: ${await actions.getTeamworkAuthStatus()}`);
}

/** Deletes stored auth for a provider. */
export async function configAuthDelete(
  args: { provider: string },
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  const deleted = await actions.deleteTeamworkApiToken();
  console.log(deleted ? `Deleted ${provider} auth.` : `${provider}: missing`);
}
