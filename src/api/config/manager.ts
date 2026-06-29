import { YAML } from "bun";
import { dirname, join, resolve } from "node:path";

import { getUserConfigDir } from "./consts.ts";
import {
  PROJECT_CONFIG_VERSION,
  ProjectConfigSchema,
  USER_CONFIG_VERSION,
  UserConfigSchema,
  type ProjectConfig,
  type ResolvedConfig,
  type UserConfig,
} from "./schema.ts";
import { formatProjectConfig, formatUserConfig } from "./templates.ts";

const USER_CONFIG_FILE = "wtc.yaml";
const PROJECT_CONFIG_FILE = ".wtc.yaml";

/** Returns the absolute path to the user-level WTC config file. */
export function getUserConfigPath(): string {
  return join(getUserConfigDir(), USER_CONFIG_FILE);
}

/**
 * Finds the nearest project config by walking upward from `startDir`.
 *
 * This mirrors tools like Git: nested directories inherit the closest parent
 * `.wtc.yaml`, and discovery stops at the filesystem root.
 */
async function getProjectConfigPath(startDir: string): Promise<string | null> {
  let current = resolve(startDir);

  while (true) {
    const candidate = join(current, PROJECT_CONFIG_FILE);
    if (await Bun.file(candidate).exists()) return candidate;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Ensures the user config file exists with current defaults. */
async function initUserConfig(): Promise<void> {
  const path = getUserConfigPath();
  if (!(await Bun.file(path).exists())) {
    await Bun.write(
      path,
      formatUserConfig({
        version: USER_CONFIG_VERSION,
        workspaceName: "",
      }),
    );
  }
}

/** Creates a project-level config file in `startDir`, failing if one already exists. */
export async function initProjectConfig(startDir: string): Promise<string> {
  const path = join(resolve(startDir), PROJECT_CONFIG_FILE);
  if (await Bun.file(path).exists()) {
    throw new Error(`Project config already exists: ${path}`);
  }

  await Bun.write(
    path,
    formatProjectConfig({
      version: PROJECT_CONFIG_VERSION,
      project: { links: [] },
      teamwork: { projectId: null, reviewTaskId: null, pinnedTaskLists: [] },
    }),
  );
  return path;
}

/** Loads and validates the user-level config file. */
async function loadUserConfig(): Promise<UserConfig> {
  await initUserConfig();
  return UserConfigSchema.parse(YAML.parse(await Bun.file(getUserConfigPath()).text()));
}

/** Validates and saves the user-level config file. */
export async function saveUserConfig(config: UserConfig): Promise<void> {
  await Bun.write(getUserConfigPath(), formatUserConfig(UserConfigSchema.parse(config)));
}

/** Loads the nearest project config, or null when no `.wtc.yaml` exists. */
export async function loadProjectConfig(startDir: string): Promise<ProjectConfig | null> {
  const path = await getProjectConfigPath(startDir);
  if (!path) return null;

  return ProjectConfigSchema.parse(YAML.parse(await Bun.file(path).text()));
}

/**
 * Saves project config to `startDir`, creating or overwriting `.wtc.yaml` there.
 *
 * The written path is returned so CLI/TUI callers can show users where changes went.
 */
export async function saveProjectConfig(config: ProjectConfig, startDir: string): Promise<string> {
  const path = join(resolve(startDir), PROJECT_CONFIG_FILE);
  await Bun.write(path, formatProjectConfig(ProjectConfigSchema.parse(config)));
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
      ? ProjectConfigSchema.parse(YAML.parse(await Bun.file(projectConfigPath).text()))
      : null,
    paths: {
      userConfigPath,
      projectConfigPath,
      projectConfigSearchStart: searchStart,
    },
  };
}
