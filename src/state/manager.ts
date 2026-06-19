import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { getCacheDir } from "./consts.ts";
import { TuiStateFileSchema, type TuiStateEntry, type TuiStateFile } from "./schema.ts";

const STATE_FILE = "tui-state.json";

const DEFAULT_ENTRY: TuiStateEntry = {
  lastRoute: {
    page: "home",
    tab: "index",
  },
  lastUpdated: new Date().toISOString(),
};

/** Loads state for a directory, returning defaults when missing or corrupt. */
export async function loadTuiState(dir: string): Promise<TuiStateEntry> {
  const path = `${getCacheDir()}/${STATE_FILE}`;
  const key = resolve(dir);

  try {
    const file = TuiStateFileSchema.parse(await Bun.file(path).json());
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
  const path = `${getCacheDir()}/${STATE_FILE}`;
  const key = resolve(dir);

  let file: TuiStateFile;
  try {
    file = TuiStateFileSchema.parse(await Bun.file(path).json());
  } catch {
    file = { version: 1, entries: {} };
  }

  const existing = file.entries[key] ?? DEFAULT_ENTRY;
  file.entries[key] = { ...existing, ...partial, lastUpdated: new Date().toISOString() };

  await Bun.write(path, `${JSON.stringify(file, null, 2)}\n`);
}

/** Deletes the entire cache directory. */
export async function clearCache(): Promise<void> {
  const cacheDir = getCacheDir();
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
}
