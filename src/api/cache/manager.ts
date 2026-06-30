import { mkdir, rm, stat, writeFile } from "node:fs/promises";

import { logError } from "../logs/manager.ts";
import { CACHE_DESCRIPTORS, getCacheDir, type CacheFileDescriptor } from "./consts.ts";

export type { CacheFileDescriptor, CacheKey } from "./consts.ts";

/** Returns the full on-disk path for a cache file name. */
export function getCachePath(name: string): string {
  return `${getCacheDir()}/${name}`;
}

/**
 * Reads a cache file as text, returning null when the file is missing.
 * Never throws — failures are logged.
 */
export async function readCacheFile(name: string): Promise<string | null> {
  const path = getCachePath(name);
  try {
    await mkdir(getCacheDir(), { recursive: true });
    return await Bun.file(path).text();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return null;
    }
    logError("cache", "cache.read.error", `Failed to read cache file: ${name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Writes a cache file, creating the cache directory if needed. Logs and rethrows on failure. */
export async function writeCacheFile(name: string, data: string): Promise<void> {
  const path = getCachePath(name);
  try {
    await mkdir(getCacheDir(), { recursive: true });
    await writeFile(path, data, "utf8");
  } catch (error) {
    logError("cache", "cache.write.error", `Failed to write cache file: ${name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Deletes a single cache file. Logs and rethrows on failure. */
export async function deleteCacheFile(name: string): Promise<void> {
  const path = getCachePath(name);
  try {
    await rm(path, { force: true });
  } catch (error) {
    logError("cache", "cache.delete.error", `Failed to delete cache file: ${name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Information about a known cache file for display in the System page. */
export interface CacheFileInfo {
  descriptor: CacheFileDescriptor;
  path: string;
  exists: boolean;
  sizeBytes: number;
}

/**
 * Returns metadata for every known cache file by checking the filesystem.
 * Non-existent files are still returned with `exists: false`.
 */
export async function listCacheFiles(): Promise<CacheFileInfo[]> {
  const results: CacheFileInfo[] = [];

  for (const descriptor of CACHE_DESCRIPTORS) {
    const filePath = getCachePath(descriptor.name);
    try {
      const fileStat = await stat(filePath);
      results.push({
        descriptor,
        path: filePath,
        exists: true,
        sizeBytes: fileStat.size,
      });
    } catch {
      results.push({
        descriptor,
        path: filePath,
        exists: false,
        sizeBytes: 0,
      });
    }
  }

  return results;
}

/** Deletes the entire cache directory (all files). */
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
