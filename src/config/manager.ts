import { JSON5 } from "bun";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  PROJECT_CONFIG_VERSION,
  ProjectConfigSchema,
  USER_CONFIG_VERSION,
  UserConfigSchema,
  type ProjectConfig,
  type ResolvedConfig,
  type UserConfig,
} from "./schema.ts";

const USER_CONFIG_FILE = "wtc.json";
const PROJECT_CONFIG_FILE = ".wtc.json";

const defaultUserConfig: UserConfig = {
  version: USER_CONFIG_VERSION,
  workspaceName: "",
};

const defaultProjectConfig: ProjectConfig = {
  version: PROJECT_CONFIG_VERSION,
  teamworkProjectId: null,
};

async function pathExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function readJson(path: string): Promise<unknown> {
  return JSON5.parse(await Bun.file(path).text());
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await Bun.write(path, `${JSON5.stringify(data, null, 2)}\n`);
}

function getUserConfigDir(): string {
  return process.env.WTC_CONFIG_DIR ?? join(homedir(), ".config", "wtc");
}

/** Returns the absolute path to the user-level WTC config file. */
export function getUserConfigPath(): string {
  return join(getUserConfigDir(), USER_CONFIG_FILE);
}

/**
 * Finds the nearest project config by walking upward from `startDir`.
 *
 * This mirrors tools like Git: nested directories inherit the closest parent
 * `.wtc.json`, and discovery stops at the filesystem root.
 */
export async function getProjectConfigPath(startDir: string): Promise<string | null> {
  let current = resolve(startDir);

  while (true) {
    const candidate = join(current, PROJECT_CONFIG_FILE);
    if (await pathExists(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Ensures the user config file exists with Phase 3 defaults. */
export async function initUserConfig(): Promise<void> {
  const path = getUserConfigPath();
  if (!(await pathExists(path))) {
    await writeJson(path, defaultUserConfig);
  }
}

/** Loads and validates the user-level config file. */
export async function loadUserConfig(): Promise<UserConfig> {
  await initUserConfig();
  return UserConfigSchema.parse(await readJson(getUserConfigPath()));
}

/** Validates and saves the user-level config file. */
export async function saveUserConfig(config: UserConfig): Promise<void> {
  await writeJson(getUserConfigPath(), UserConfigSchema.parse(config));
}

/** Loads the nearest project config, or null when no `.wtc.json` exists. */
export async function loadProjectConfig(startDir: string): Promise<ProjectConfig | null> {
  const path = await getProjectConfigPath(startDir);
  if (!path) return null;

  return ProjectConfigSchema.parse(await readJson(path));
}

/**
 * Saves project config to the nearest discovered `.wtc.json`.
 *
 * If discovery finds no project config, the file is created in `startDir`. The
 * written path is returned so CLI/TUI callers can show users where changes went.
 */
export async function saveProjectConfig(config: ProjectConfig, startDir: string): Promise<string> {
  const path =
    (await getProjectConfigPath(startDir)) ?? join(resolve(startDir), PROJECT_CONFIG_FILE);
  await writeJson(path, ProjectConfigSchema.parse(config));
  return path;
}

/**
 * Loads user config, nearest project config, and all paths used for resolution.
 */
export async function loadResolvedConfig(startDir: string): Promise<ResolvedConfig> {
  const searchStart = resolve(startDir);
  const userConfigPath = getUserConfigPath();
  const projectConfigPath = await getProjectConfigPath(searchStart);

  return {
    user: await loadUserConfig(),
    project: projectConfigPath
      ? ProjectConfigSchema.parse(await readJson(projectConfigPath))
      : null,
    paths: {
      userConfigPath,
      projectConfigPath,
      projectConfigSearchStart: searchStart,
    },
  };
}

/** Default project config used when callers need to create a new `.wtc.json`. */
export function createDefaultProjectConfig(): ProjectConfig {
  return { ...defaultProjectConfig };
}
