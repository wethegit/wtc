import { homedir } from "node:os";
import { join } from "node:path";

/** Root directory for all deletable runtime data (cache, TUI state, etc.). */
export function getCacheDir(): string {
  return process.env.WTC_CACHE_DIR ?? join(homedir(), ".config", "wtc", "cache");
}
