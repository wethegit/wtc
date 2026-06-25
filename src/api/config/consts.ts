import { homedir } from "node:os";
import { join } from "node:path";

/** Current application version injected by the build script for releases. */
export const APP_VERSION = process.env.APP_VERSION ?? "0.1.0";

/** GitHub repository slug used by update and install flows. */
export const REPO = "wethegit/wtc";

/** User config directory, overridable via WTC_CONFIG_DIR for tests or CI. */
export function getUserConfigDir(): string {
  return process.env.WTC_CONFIG_DIR ?? join(homedir(), ".config", "wtc");
}
