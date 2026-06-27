import { loadResolvedConfig } from "../../api/config/manager.ts";
import type { ResolvedConfig } from "../../api/config/schema.ts";

/**
 * Formats resolved config for `wtc settings` output.
 */
function formatSettingsOutput(config: ResolvedConfig): string {
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
