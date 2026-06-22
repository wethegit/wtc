import { clearCache } from "../../state/manager.ts";

/** Deletes the entire WTC cache directory. */
export async function cacheClean(): Promise<void> {
  await clearCache();
  console.log("Cache cleaned.");
}
