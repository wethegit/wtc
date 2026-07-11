import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface GitHubRemote {
  owner: string;
  repo: string;
}

// Assumes `.git` suffix appears only at the end of the URL, not in a repo/organisation
// name. This is almost always the case — GitHub rejects dots in org names and repo names
// with `.git` that are not the suffix are exceedingly rare.
const SSH_PATTERN =
  /^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const HTTPS_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const REMOTE_HEAD_WAIT_ATTEMPTS = 30;
const REMOTE_HEAD_WAIT_DELAY_MS = 1_000;

function getErrorProperty(error: unknown, key: string): unknown {
  if (typeof error !== "object" || error === null || !(key in error)) return undefined;
  return Reflect.get(error, key);
}

function formatOutput(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value instanceof Uint8Array) {
    const text = new TextDecoder().decode(value).trim();
    return text || null;
  }
  return null;
}

function formatGitError(action: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const exitCode = getErrorProperty(error, "exitCode");
  const stderr = formatOutput(getErrorProperty(error, "stderr"));
  const stdout = formatOutput(getErrorProperty(error, "stdout"));
  const details = [
    typeof exitCode === "number" ? `exit code ${exitCode}` : message,
    stderr ? `stderr: ${stderr}` : null,
    stdout ? `stdout: ${stdout}` : null,
  ].filter((detail): detail is string => detail !== null);

  return new Error(`${action} failed: ${details.join("\n")}`);
}

async function runGitStep<T>(action: string, command: () => Promise<T>): Promise<T> {
  try {
    return await command();
  } catch (error) {
    throw formatGitError(action, error);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRemoteHead(remoteUrl: string): Promise<void> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= REMOTE_HEAD_WAIT_ATTEMPTS; attempt += 1) {
    try {
      const output = await Bun.$`git ls-remote --symref ${remoteUrl} HEAD`.quiet().text();
      if (output.includes("refs/heads/")) return;
      lastError = "remote HEAD was not available yet";
    } catch (error) {
      lastError = formatGitError("Git remote readiness check", error).message;
    }

    if (attempt < REMOTE_HEAD_WAIT_ATTEMPTS) await sleep(REMOTE_HEAD_WAIT_DELAY_MS);
  }

  throw new Error(
    `GitHub repository branch was not ready after ${REMOTE_HEAD_WAIT_ATTEMPTS} attempts (${REMOTE_HEAD_WAIT_DELAY_MS}ms delay).${lastError ? ` Last check: ${lastError}` : ""}`,
  );
}

function matchGitHubRemote(url: string, pattern: RegExp): GitHubRemote | null {
  const match = url.match(pattern);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function parseGitHubRemoteUrl(url: string): GitHubRemote | null {
  const trimmed = url.trim();
  return matchGitHubRemote(trimmed, SSH_PATTERN) ?? matchGitHubRemote(trimmed, HTTPS_PATTERN);
}

export async function detectRepo(projectDir = process.cwd()): Promise<string | null> {
  try {
    const url = (await Bun.$`git remote get-url origin`.cwd(projectDir).text()).trim();
    return url || null;
  } catch {
    return null;
  }
}

export async function currentBranch(projectDir = process.cwd()): Promise<string> {
  return (await Bun.$`git rev-parse --abbrev-ref HEAD`.cwd(projectDir).text()).trim();
}

export async function createBranch(name: string, projectDir = process.cwd()): Promise<void> {
  await Bun.$`git checkout -b ${name}`.cwd(projectDir).quiet();
}

export async function pushBranch(name: string, projectDir = process.cwd()): Promise<void> {
  await Bun.$`git push -u origin ${name}`.cwd(projectDir).quiet();
}

export async function branchExists(name: string, projectDir = process.cwd()): Promise<boolean> {
  try {
    await Bun.$`git rev-parse --verify refs/heads/${name}`.cwd(projectDir).quiet();
    return true;
  } catch {
    return false;
  }
}

export async function cloneRepo(input: {
  remoteUrl: string;
  parentDir: string;
  repoName: string;
}): Promise<string> {
  const parentDir = resolve(input.parentDir);
  const cloneDir = await assertCloneTargetAvailable(parentDir, input.repoName);
  await mkdir(parentDir, { recursive: true });
  await waitForRemoteHead(input.remoteUrl);
  await runGitStep("Git clone", () => Bun.$`git clone ${input.remoteUrl} ${cloneDir}`.quiet());
  return cloneDir;
}

export function getCloneDir(parentDir: string, repoName: string): string {
  return join(resolve(parentDir), repoName);
}

export async function assertCloneTargetAvailable(
  parentDir: string,
  repoName: string,
): Promise<string> {
  const cloneDir = getCloneDir(parentDir, repoName);
  try {
    await stat(cloneDir);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return cloneDir;
    }
    throw error;
  }
  throw new Error(`Clone target already exists: ${cloneDir}`);
}

export async function commitFile(
  relativePath: string,
  message: string,
  projectDir = process.cwd(),
): Promise<void> {
  await runGitStep("Git add", () => Bun.$`git add -- ${relativePath}`.cwd(projectDir).quiet());
  await runGitStep("Git commit", () => Bun.$`git commit -m ${message}`.cwd(projectDir).quiet());
}

export async function pushCurrentBranch(projectDir = process.cwd()): Promise<void> {
  await runGitStep("Git push", () => Bun.$`git push`.cwd(projectDir).quiet());
}
