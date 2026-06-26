import { Octokit } from "@octokit/rest";

import { getGitHubApiToken } from "./auth.ts";

/** Returns an authenticated Octokit instance using the stored GitHub token. */
export async function getOctokit(): Promise<Octokit> {
  const token = await getGitHubApiToken();
  if (!token) throw new Error("GitHub API token is missing.");

  return new Octokit({
    auth: token,
    userAgent: "wtc",
  });
}
