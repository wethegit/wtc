const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REPO = "wethegit/homebrew-wtc";

function getCachePaths(): { cacheDir: string; cachePath: string } {
  const homeDir = Bun.env.HOME ?? process.env.HOME ?? ".";
  const cacheDir = process.env.WTC_CACHE_DIR ?? `${homeDir}/.cache/wtc`;
  return { cacheDir, cachePath: `${cacheDir}/update-check.json` };
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, "");
}

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

interface UpdateCache {
  latestVersion: string;
  checkedAt: number;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

async function readCache(): Promise<UpdateCache | null> {
  try {
    const { cachePath } = getCachePaths();
    const raw = await Bun.file(cachePath).text();
    return JSON.parse(raw) as UpdateCache;
  } catch {
    return null;
  }
}

async function writeCache(cache: UpdateCache): Promise<void> {
  const { cachePath } = getCachePaths();

  await Bun.write(cachePath, JSON.stringify(cache));
}

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

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo> {
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
