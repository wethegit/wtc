import { loadResolvedConfig } from "../../config/manager.ts";
import type { ResolvedConfig } from "../../config/schema.ts";

/**
 * Formats resolved config for `wtc settings` output.
 *
 * Keep this pure so CLI output can be tested without spawning a subprocess or
 * touching the real user config directory.
 */
export function formatSettingsOutput(config: ResolvedConfig): string {
  return [
    `User config: ${config.paths.userConfigPath}`,
    `Project search start: ${config.paths.projectConfigSearchStart}`,
    `Project config: ${config.paths.projectConfigPath ?? "not found"}`,
    "",
    JSON.stringify(
      {
        user: config.user,
        project: config.project,
      },
      null,
      2,
    ),
  ].join("\n");
}

/** Prints the resolved WTC config and the paths used to build it. */
export async function settings(startDir = process.cwd()): Promise<void> {
  console.log(formatSettingsOutput(await loadResolvedConfig(startDir)));
}
