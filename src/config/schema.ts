import { z } from "zod";

/** Current user config file format version. */
export const USER_CONFIG_VERSION = 1;

/** Current project config file format version. */
export const PROJECT_CONFIG_VERSION = 1;

/**
 * User-level config schema for `~/.config/wtc/wtc.yaml`.
 *
 * `version` tracks the file format, not the WTC application version. Keep the
 * v1 schema named explicitly so future migrations have a clear source format.
 */
export const UserConfigV1Schema = z.object({
  version: z.literal(USER_CONFIG_VERSION),
  workspaceName: z.string().default(""),
});

/**
 * Project-level config schema for nearest-ancestor `.wtc.yaml` files.
 *
 * `teamworkProjectId` is nullable until a repo is linked to Teamwork.
 */
export const ProjectConfigV1Schema = z.object({
  version: z.literal(PROJECT_CONFIG_VERSION),
  teamworkProjectId: z.number().int().positive().nullable().default(null),
});

/** Active user config schema. Alias this to a newer schema when v2 exists. */
export const UserConfigSchema = UserConfigV1Schema;

/** Active project config schema. Alias this to a newer schema when v2 exists. */
export const ProjectConfigSchema = ProjectConfigV1Schema;

/** Parsed and validated user config shape. */
export type UserConfig = z.infer<typeof UserConfigSchema>;

/** Parsed and validated project config shape. */
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/** Filesystem paths used while resolving layered config. */
export interface ConfigPaths {
  /** Absolute path to the user config file. */
  userConfigPath: string;
  /** Absolute path to the nearest project config file, or null when absent. */
  projectConfigPath: string | null;
  /** Directory where project config discovery started. */
  projectConfigSearchStart: string;
}

/** Layered config result consumed by CLI and TUI settings views. */
export interface ResolvedConfig {
  /** User-level settings from `~/.config/wtc/wtc.yaml`. */
  user: UserConfig;
  /** Project-level settings from nearest `.wtc.yaml`, or null when absent. */
  project: ProjectConfig | null;
  /** Paths used to build this resolved config. */
  paths: ConfigPaths;
}
