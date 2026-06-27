import { APP_VERSION } from "../api/config/consts.ts";
import { getCacheDir } from "../api/cache/consts.ts";

/** How long a successful GitHub release lookup remains fresh. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REPO = "wethegit/wtc";

/** Returns the update cache location. */
function getCachePaths(): { cacheDir: string; cachePath: string } {
  const cacheDir = getCacheDir();
  return { cacheDir, cachePath: `${cacheDir}/update-check.json` };
}

/** Normalizes release tags so `v1.2.3` and `1.2.3` compare equally. */
function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, "");
}

/**
 * Compares semantic-looking versions from GitHub release tags.
 *
 * Falls back to string comparison when either side contains non-numeric parts so
 * pre-releases or unexpected tags remain deterministic instead of throwing.
 */
function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left).split(".").map(Number);
  const rightParts = normalizeVersion(right).split(".").map(Number);

  if (leftParts.some(Number.isNaN) || rightParts.some(Number.isNaN)) {
    return normalizeVersion(left).localeCompare(normalizeVersion(right));
  }

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

/** Cached latest release lookup. */
interface UpdateCache {
  /** Latest version tag returned by GitHub. */
  latestVersion: string;
  /** Unix timestamp in milliseconds for when the lookup was cached. */
  checkedAt: number;
}

/** Result returned by the update checker. */
export interface UpdateInfo {
  /** Version currently running. */
  currentVersion: string;
  /** Latest known release version. */
  latestVersion: string;
  /** Whether `latestVersion` is newer than `currentVersion`. */
  updateAvailable: boolean;
}

/** Reads the cached release lookup, returning null when missing or invalid. */
async function readCache(): Promise<UpdateCache | null> {
  try {
    const { cachePath } = getCachePaths();
    const raw = await Bun.file(cachePath).text();
    return JSON.parse(raw) as UpdateCache;
  } catch {
    return null;
  }
}

/** Writes the latest successful release lookup to the local cache. */
async function writeCache(cache: UpdateCache): Promise<void> {
  const { cachePath } = getCachePaths();

  await Bun.write(cachePath, JSON.stringify(cache));
}

/** Fetches the latest GitHub release tag for the WTC repository. */
async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { "User-Agent": "wtc" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const data = (await response.json()) as { tag_name: string };
  return data.tag_name;
}

/**
 * Checks whether a newer WTC release exists.
 *
 * The checker prefers cached data for fast startup, refreshes from GitHub when
 * the cache is stale, and falls back to stale cache data if the network request
 * fails. If no cache exists and GitHub is unavailable, it reports no update so
 * startup remains quiet and non-blocking.
 */
export async function checkForUpdate(currentVersion = APP_VERSION): Promise<UpdateInfo> {
  const cached = await readCache();
  const now = Date.now();

  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return {
      currentVersion,
      latestVersion: cached.latestVersion,
      updateAvailable: compareVersions(cached.latestVersion, currentVersion) > 0,
    };
  }

  try {
    const latestVersion = await fetchLatestVersion();
    await writeCache({ latestVersion, checkedAt: now });

    return {
      currentVersion,
      latestVersion,
      updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    };
  } catch {
    if (cached) {
      return {
        currentVersion,
        latestVersion: cached.latestVersion,
        updateAvailable: compareVersions(cached.latestVersion, currentVersion) > 0,
      };
    }

    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
    };
  }
}
