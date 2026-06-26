const GITHUB_SECRET_SERVICE = "wtc";
const GITHUB_TOKEN_SECRET_NAME = "github-api-token";

/** Safe-to-display auth state. The token value itself must never be surfaced. */
export type GitHubAuthStatus = "configured" | "missing";

/** Returns the stored GitHub personal access token, or null when not configured. */
export async function getGitHubApiToken(): Promise<string | null> {
  return Bun.secrets.get({
    service: GITHUB_SECRET_SERVICE,
    name: GITHUB_TOKEN_SECRET_NAME,
  });
}

/** Stores a GitHub personal access token in OS secrets. */
export async function setGitHubApiToken(token: string): Promise<void> {
  const value = token.trim();
  if (!value) throw new Error("GitHub API token cannot be empty.");

  await Bun.secrets.set({
    service: GITHUB_SECRET_SERVICE,
    name: GITHUB_TOKEN_SECRET_NAME,
    value,
  });
}

/** Deletes the stored GitHub API token. Returns false when no token existed. */
export async function deleteGitHubApiToken(): Promise<boolean> {
  return Bun.secrets.delete({
    service: GITHUB_SECRET_SERVICE,
    name: GITHUB_TOKEN_SECRET_NAME,
  });
}

/** Returns whether a GitHub API token is configured, without exposing the value. */
export async function getGitHubAuthStatus(): Promise<GitHubAuthStatus> {
  return (await getGitHubApiToken()) ? "configured" : "missing";
}
