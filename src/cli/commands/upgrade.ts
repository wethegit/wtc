import { checkForUpdate } from "../../utils/update-check.ts";
import { APP_VERSION } from "../../version.ts";

const REPO = "wethegit/homebrew-wtc";

export interface ManagedInstallInfo {
  manager: "Homebrew" | "pacman/AUR";
  command: string;
}

function getParentDirectory(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  if (separatorIndex === 0) return "/";
  if (separatorIndex < 0) return ".";
  return path.slice(0, separatorIndex);
}

async function getCurrentBinaryPath(): Promise<string | null> {
  try {
    if (process.platform === "linux") {
      const result = await Bun.$`readlink /proc/self/exe`.quiet();
      return result.stdout.toString().trim();
    }

    const result = Bun.which("wtc");
    return result ?? null;
  } catch {
    return null;
  }
}

export function getManagedInstallInfoFromPath(binaryPath: string): ManagedInstallInfo | null {
  if (
    binaryPath.includes("/opt/homebrew/") ||
    binaryPath.includes("/usr/local/Homebrew/") ||
    binaryPath.includes("/home/linuxbrew/.linuxbrew/") ||
    binaryPath.includes("/Cellar/")
  ) {
    return { manager: "Homebrew", command: "brew upgrade wtc" };
  }

  return null;
}

function isPacmanOwned(binaryPath: string): boolean {
  if (!Bun.which("pacman")) {
    return false;
  }

  const result = Bun.spawnSync({
    cmd: ["pacman", "-Qo", binaryPath],
    stdout: "ignore",
    stderr: "ignore",
  });

  return result.exitCode === 0;
}

function getManagedInstallInfo(binaryPath: string): ManagedInstallInfo | null {
  const pathInfo = getManagedInstallInfoFromPath(binaryPath);
  if (pathInfo) {
    return pathInfo;
  }

  if (isPacmanOwned(binaryPath)) {
    return { manager: "pacman/AUR", command: "yay -Syu wtc" };
  }

  return null;
}

export function getManagedInstallError(info: ManagedInstallInfo): string {
  return [
    `wtc is managed by ${info.manager}. Self-upgrade is disabled to avoid bypassing your package manager.`,
    `Update with: ${info.command}`,
  ].join("\n");
}

function detectPlatform(): string {
  const os = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";

  if (os === "linux" && arch === "arm64") {
    throw new Error("Linux arm64 binaries are not published yet.");
  }

  return `${os}-${arch}`;
}

export async function upgrade(flag?: { check?: boolean }): Promise<void> {
  const currentVersion = APP_VERSION;
  const info = await checkForUpdate(currentVersion);

  if (!info.updateAvailable) {
    console.log(`You're up to date (v${currentVersion}).`);
    return;
  }

  console.log(`Update available: ${info.latestVersion} (you have v${currentVersion})`);

  if (flag?.check) {
    return;
  }

  const binaryPath = await getCurrentBinaryPath();
  if (!binaryPath) {
    console.error("Could not detect wtc binary path. Try reinstalling via the install script:");
    console.error(
      "  curl -fsSL https://raw.githubusercontent.com/wethegit/homebrew-wtc/main/install.sh | bash",
    );
    process.exit(1);
  }

  const managedInstall = getManagedInstallInfo(binaryPath);
  if (managedInstall) {
    console.error(getManagedInstallError(managedInstall));
    process.exit(1);
  }

  let platform: string;
  try {
    platform = detectPlatform();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unsupported platform.");
    process.exit(1);
  }
  const url = `https://github.com/${REPO}/releases/download/${info.latestVersion}/wtc-${platform}`;

  console.log(`Downloading ${info.latestVersion} (${platform})...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Download failed: GitHub responded with ${response.status}`);
    process.exit(1);
  }

  const binary = await response.arrayBuffer();
  const binaryBytes = new Uint8Array(binary);
  const tempPath = `${getParentDirectory(binaryPath)}/.wtc-${crypto.randomUUID()}.new`;

  try {
    await Bun.write(tempPath, binaryBytes);
    await Bun.$`chmod 755 ${tempPath}`.quiet();
    await Bun.$`mv -f ${tempPath} ${binaryPath}`.quiet();
  } catch (error) {
    await Bun.$`rm -f ${tempPath}`.quiet();
    console.error(error instanceof Error ? error.message : "Update failed.");
    process.exit(1);
  }

  console.log(`Updated to ${info.latestVersion}. Restart wtc to use it.`);
}
