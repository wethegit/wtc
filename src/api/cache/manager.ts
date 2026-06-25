import { mkdir, rm } from "node:fs/promises";

import { getCacheDir } from "./consts.ts";

/** Deletes the entire cache directory. */
export async function clearCache(): Promise<void> {
  const cacheDir = getCacheDir();
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
}
