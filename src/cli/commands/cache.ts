import { clearCache } from "../../state/manager.ts";

export async function cacheClean(): Promise<void> {
  await clearCache();
  console.log("Cache cleaned.");
}
