import { mkdir, rm } from "node:fs/promises";

import { logError } from "../logs/manager.ts";
import { getCacheDir } from "./consts.ts";

/** Deletes the entire cache directory. */
export async function clearCache(): Promise<void> {
  const cacheDir = getCacheDir();
  try {
    await rm(cacheDir, { recursive: true, force: true });
    await mkdir(cacheDir, { recursive: true });
  } catch (error) {
    logError("cache", "cache.clear.error", "Failed to clear cache", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
