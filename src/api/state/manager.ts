import { resolve } from "node:path";

import { logError } from "../logs/manager.ts";
import { readCacheFile, writeCacheFile } from "../cache/manager.ts";
import { CACHE } from "../cache/consts.ts";
import { TuiStateFileSchema, type TuiStateEntry, type TuiStateFile } from "./schema.ts";

const DEFAULT_ENTRY: TuiStateEntry = {
  lastRoute: {
    page: "home",
    tab: "index",
  },
  lastUpdated: new Date().toISOString(),
};

/** Loads state for a directory, returning defaults when missing or corrupt. */
export async function loadTuiState(dir: string): Promise<TuiStateEntry> {
  const key = resolve(dir);

  try {
    const raw = await readCacheFile(CACHE.tuiState);
    const file = TuiStateFileSchema.parse(JSON.parse(raw ?? "{}"));
    return file.entries[key] ?? { ...DEFAULT_ENTRY, lastUpdated: new Date().toISOString() };
  } catch {
    return { ...DEFAULT_ENTRY, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Merges partial state for a directory and writes to disk.
 *
 * Creates the cache directory and state file on first write. Reads existing file
 * for merging so concurrent tabs do not lose data.
 */
export async function saveTuiState(dir: string, partial: Partial<TuiStateEntry>): Promise<void> {
  const key = resolve(dir);

  let file: TuiStateFile;
  try {
    const raw = await readCacheFile(CACHE.tuiState);
    file = TuiStateFileSchema.parse(JSON.parse(raw ?? "{}"));
  } catch {
    file = { version: 1, entries: {} };
  }

  const existing = file.entries[key] ?? DEFAULT_ENTRY;
  file.entries[key] = { ...existing, ...partial, lastUpdated: new Date().toISOString() };

  try {
    await writeCacheFile(CACHE.tuiState, `${JSON.stringify(file, null, 2)}\n`);
  } catch (error) {
    logError("state", "state.save.error", "Failed to save TUI state", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
