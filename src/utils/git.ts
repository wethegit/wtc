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
  await Bun.$`git clone ${input.remoteUrl} ${cloneDir}`.quiet();
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
  await Bun.$`git add ${relativePath}`.cwd(projectDir).quiet();
  await Bun.$`git commit -m ${message}`.cwd(projectDir).quiet();
}

export async function pushCurrentBranch(projectDir = process.cwd()): Promise<void> {
  await Bun.$`git push`.cwd(projectDir).quiet();
}
