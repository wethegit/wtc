import { initProjectConfig } from "../../config/manager.ts";
import {
  deleteTeamworkApiToken,
  getTeamworkAuthStatus,
  setTeamworkApiToken,
  type TeamworkAuthStatus,
} from "../../teamwork/auth.ts";

/** Shared with yargs so accepted CLI providers and handler validation stay in sync. */
export const CONFIG_AUTH_PROVIDERS = ["teamwork"] as const;
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

export async function configAuthSet(
  args: { provider: string; token: string | undefined },
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  if (!args.token) throw new Error(`Missing token for ${provider}.`);

  await actions.setTeamworkApiToken(args.token);
  console.log(`Configured ${provider} auth.`);
}

export async function configAuthStatus(
  args: { provider: string },
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  console.log(`${provider}: ${await actions.getTeamworkAuthStatus()}`);
}

export async function configAuthDelete(
  args: { provider: string },
  actions = teamworkAuthActions,
): Promise<void> {
  const provider = requireConfigAuthProvider(args.provider);
  const deleted = await actions.deleteTeamworkApiToken();
  console.log(deleted ? `Deleted ${provider} auth.` : `${provider}: missing`);
}
