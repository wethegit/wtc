import { z } from "zod";

import { getCacheDir } from "../cache/consts.ts";

import { getOctokit } from "./client.ts";

const USER_CACHE_FILE = "github-user.json";
const USER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const GitHubUserApiSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

const GitHubUserCacheEntrySchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  cachedAt: z.number(),
});

const GitHubUserCacheFileSchema = z.object({
  version: z.literal(1),
  user: GitHubUserCacheEntrySchema.nullable(),
});

type GitHubUserCacheFile = z.infer<typeof GitHubUserCacheFileSchema>;

export interface GitHubCurrentUser {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export async function getGitHubCurrentUser(): Promise<GitHubCurrentUser> {
  const now = Date.now();
  let cache: GitHubUserCacheFile;

  try {
    cache = GitHubUserCacheFileSchema.parse(
      JSON.parse(await Bun.file(`${getCacheDir()}/${USER_CACHE_FILE}`).text()),
    );
  } catch {
    cache = { version: 1, user: null };
  }

  if (cache.user && now - cache.user.cachedAt < USER_CACHE_TTL_MS) {
    return {
      login: cache.user.login,
      name: cache.user.name,
      avatarUrl: cache.user.avatarUrl,
    };
  }

  try {
    const octokit = await getOctokit();
    const response = await octokit.rest.users.getAuthenticated();
    const parsed = GitHubUserApiSchema.parse(response.data);

    const user: GitHubCurrentUser = {
      login: parsed.login,
      name: parsed.name,
      avatarUrl: parsed.avatar_url,
    };

    cache.user = { ...user, avatarUrl: user.avatarUrl, cachedAt: now };
    await Bun.write(`${getCacheDir()}/${USER_CACHE_FILE}`, `${JSON.stringify(cache, null, 2)}\n`);
    return user;
  } catch (error) {
    if (cache.user) {
      return {
        login: cache.user.login,
        name: cache.user.name,
        avatarUrl: cache.user.avatarUrl,
      };
    }
    throw error;
  }
}
