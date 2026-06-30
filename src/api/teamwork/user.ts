import { z } from "zod";

import { readCacheFile, writeCacheFile } from "../cache/manager.ts";
import { CACHE } from "../cache/consts.ts";

import { fetchTeamworkApiJson } from "./client.ts";
import { TEAMWORK_BASE_URL } from "./consts.ts";

const USER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TeamworkPersonApiSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]),
  name: z.string().optional(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const TeamworkMeApiResponseSchema = z.object({
  person: TeamworkPersonApiSchema,
});

const TeamworkUserCacheEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  cachedAt: z.number(),
});

const TeamworkUserCacheFileSchema = z.object({
  version: z.literal(1),
  user: TeamworkUserCacheEntrySchema.nullable(),
});

type TeamworkUserCacheFile = z.infer<typeof TeamworkUserCacheFileSchema>;

/** The current authenticated Teamwork user's basic profile. */
export interface TeamworkCurrentUser {
  /** Teamwork user ID. */
  id: number;
  /** Human-readable display name. */
  name: string;
  /** Email address. */
  email: string | null;
  /** Avatar URL. */
  avatarUrl: string | null;
  /** Browser URL for the user's profile. */
  url: string;
}

/** Fetches the current Teamwork user's profile, cached on disk for 30 days. Falls back to stale cache on network error. */
export async function getTeamworkCurrentUser(): Promise<TeamworkCurrentUser> {
  const now = Date.now();
  let cache: TeamworkUserCacheFile;

  try {
    const raw = await readCacheFile(CACHE.teamworkUser);
    cache = TeamworkUserCacheFileSchema.parse(JSON.parse(raw ?? "{}"));
  } catch {
    cache = { version: 1, user: null };
  }

  if (cache.user && now - cache.user.cachedAt < USER_CACHE_TTL_MS) {
    return {
      id: cache.user.id,
      name: cache.user.name,
      email: cache.user.email ?? null,
      avatarUrl: cache.user.avatarUrl ?? null,
      url: `${TEAMWORK_BASE_URL}/app/profile/${cache.user.id}`,
    };
  }

  try {
    const parsed = TeamworkMeApiResponseSchema.parse(await fetchTeamworkApiJson("/me.json"));
    const person = parsed.person;
    const name =
      person.name?.trim() || [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
    if (!name) throw new Error("Teamwork /me.json response did not include a user name.");

    const user: TeamworkCurrentUser = {
      id: person.id,
      name,
      email: person.email?.trim() || null,
      avatarUrl: person.avatarUrl?.trim() || null,
      url: `${TEAMWORK_BASE_URL}/app/profile/${person.id}`,
    };

    cache.user = {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      cachedAt: now,
    };
    await writeCacheFile(CACHE.teamworkUser, `${JSON.stringify(cache, null, 2)}\n`);
    return user;
  } catch (error) {
    if (cache.user) {
      return {
        id: cache.user.id,
        name: cache.user.name,
        email: cache.user.email ?? null,
        avatarUrl: cache.user.avatarUrl ?? null,
        url: `${TEAMWORK_BASE_URL}/app/profile/${cache.user.id}`,
      };
    }
    throw error;
  }
}

/** Convenience wrapper that returns only the current user's Teamwork user ID. */
export async function getTeamworkCurrentUserId(): Promise<number> {
  const user = await getTeamworkCurrentUser();
  return user.id;
}
