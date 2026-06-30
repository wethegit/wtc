import { z } from "zod";

import { readCacheFile, writeCacheFile } from "../cache/manager.ts";
import { CACHE } from "../cache/consts.ts";

import { fetchTeamworkApiJson } from "./client.ts";

const PROJECT_METADATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const TeamworkProjectApiSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]),
  name: z.string().optional(),
  title: z.string().optional(),
});

const TeamworkProjectApiResponseSchema = z.object({
  project: TeamworkProjectApiSchema,
});

const TeamworkProjectCacheEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  cachedAt: z.number(),
});

const TeamworkProjectCacheFileSchema = z.object({
  version: z.literal(1),
  projects: z.record(z.string(), TeamworkProjectCacheEntrySchema),
});

type TeamworkProjectCacheFile = z.infer<typeof TeamworkProjectCacheFileSchema>;

/** A Teamwork project resolved from the API. */
export interface TeamworkProjectMetadata {
  /** Teamwork project ID configured in `.wtc.yaml`. */
  id: number;
  /** Human-readable project name returned by Teamwork. */
  name: string;
}

/** Result of a project metadata lookup, indicating whether the value was cached or freshly fetched. */
export interface TeamworkProjectMetadataResult {
  project: TeamworkProjectMetadata;
  source: "cache" | "network";
}

/** Fetches Teamwork project metadata by project ID, cached for 24 hours. Falls back to stale cache on network error. */
export async function getTeamworkProjectMetadata(
  projectId: number,
): Promise<TeamworkProjectMetadataResult> {
  const key = projectId.toString();
  const now = Date.now();
  let cache: TeamworkProjectCacheFile;

  try {
    const raw = await readCacheFile(CACHE.projectMetadata);
    cache = TeamworkProjectCacheFileSchema.parse(JSON.parse(raw ?? "{}"));
  } catch {
    cache = { version: 1, projects: {} };
  }

  const cached = cache.projects[key];
  if (cached && now - cached.cachedAt < PROJECT_METADATA_CACHE_TTL_MS) {
    return { project: { id: cached.id, name: cached.name }, source: "cache" };
  }

  try {
    const parsed = TeamworkProjectApiResponseSchema.parse(
      await fetchTeamworkApiJson(`/projects/${projectId}.json`),
    );
    const name = parsed.project.name ?? parsed.project.title;
    if (!name) throw new Error("Teamwork project response did not include a project name.");

    const project = { id: parsed.project.id, name };
    cache.projects[key] = { ...project, cachedAt: now };
    // Endpoint-specific cache for now; add a shared cache layer only when more
    // Teamwork endpoints need common invalidation behavior.
    await writeCacheFile(CACHE.projectMetadata, `${JSON.stringify(cache, null, 2)}\n`);
    return { project, source: "network" };
  } catch (error) {
    if (cached) return { project: { id: cached.id, name: cached.name }, source: "cache" };
    throw error;
  }
}
