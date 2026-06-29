import { clearCache } from "../../api/cache/manager.ts";
import { logInfo } from "../../api/logs/manager.ts";

/** Deletes the entire WTC cache directory. */
export async function cacheClean(): Promise<void> {
  logInfo("cli.cache", "cache.clean.start", "Clearing cache");
  await clearCache();
  logInfo("cli.cache", "cache.clean.success", "Cache cleared");
  console.log("Cache cleaned.");
}
