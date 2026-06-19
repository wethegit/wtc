import { z } from "zod";

import { getCacheDir } from "../state/consts.ts";

import { fetchTeamworkApiJson } from "./client.ts";

const PROJECT_METADATA_CACHE_FILE = "teamwork-project-metadata.json";
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

export interface TeamworkProjectMetadata {
  /** Teamwork project ID configured in `.wtc.yaml`. */
  id: number;
  /** Human-readable project name returned by Teamwork. */
  name: string;
}

export interface TeamworkProjectMetadataResult {
  project: TeamworkProjectMetadata;
  source: "cache" | "network";
}

export async function getTeamworkProjectMetadata(
  projectId: number,
): Promise<TeamworkProjectMetadataResult> {
  const key = projectId.toString();
  const now = Date.now();
  let cache: TeamworkProjectCacheFile = { version: 1, projects: {} };

  try {
    cache = TeamworkProjectCacheFileSchema.parse(
      JSON.parse(await Bun.file(`${getCacheDir()}/${PROJECT_METADATA_CACHE_FILE}`).text()),
    );
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
    await Bun.write(
      `${getCacheDir()}/${PROJECT_METADATA_CACHE_FILE}`,
      `${JSON.stringify(cache, null, 2)}\n`,
    );
    return { project, source: "network" };
  } catch (error) {
    if (cached) return { project: { id: cached.id, name: cached.name }, source: "cache" };
    throw error;
  }
}
