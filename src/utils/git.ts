export interface GitHubRemote {
  owner: string;
  repo: string;
}

const SSH_PATTERN = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/;
const HTTPS_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;

function extractSshMatch(url: string): GitHubRemote | null {
  const match = url.match(SSH_PATTERN);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo) return null;
  return { owner, repo };
}

function extractHttpsMatch(url: string): GitHubRemote | null {
  const match = url.match(HTTPS_PATTERN);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function parseGitHubRemoteUrl(url: string): GitHubRemote | null {
  const trimmed = url.trim();
  return extractSshMatch(trimmed) ?? extractHttpsMatch(trimmed);
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
  await Bun.$`git checkout -b ${name}`.cwd(projectDir);
}

export async function pushBranch(name: string, projectDir = process.cwd()): Promise<void> {
  await Bun.$`git push -u origin ${name}`.cwd(projectDir);
}
