import { clearCache as clearCacheFn } from "../../state/manager.ts";

interface CacheCleanActions {
  clearCache: () => Promise<void>;
}

const cacheCleanActions: CacheCleanActions = {
  clearCache: clearCacheFn,
};

/** Deletes the entire WTC cache directory. */
export async function cacheClean(actions = cacheCleanActions): Promise<void> {
  await actions.clearCache();
  console.log("Cache cleaned.");
}
