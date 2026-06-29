import { z } from "zod";

import { logError } from "../logs/manager.ts";
import { getCacheDir } from "../cache/consts.ts";
import { fetchTeamworkApiJson } from "./client.ts";

const WORKFLOW_STAGES_CACHE_FILE = "teamwork-workflow-stages.json";
const WORKFLOW_STAGES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const StageSchema = z.object({
  id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  name: z.string().optional(),
  color: z.string().optional(),
});

const WorkflowResponseSchema = z.object({
  included: z
    .object({
      stages: z.record(z.string(), StageSchema).optional(),
    })
    .optional(),
});

interface WorkflowStagesCacheEntry {
  stages: Record<string, { name: string; color: string | null }>;
  cachedAt: number;
}

interface WorkflowStagesCacheFile {
  version: number;
  workflows: Record<string, WorkflowStagesCacheEntry>;
}

/** Fetches workflow stage names and colors from Teamwork, cached on disk for 7 days. */
export async function getWorkflowStageNames(
  workflowId: number,
): Promise<Map<number, { name: string; color: string | null }>> {
  const key = workflowId.toString();
  const now = Date.now();
  let cache: WorkflowStagesCacheFile;
  let cacheWasUpgraded = false;

  try {
    cache = JSON.parse(await Bun.file(`${getCacheDir()}/${WORKFLOW_STAGES_CACHE_FILE}`).text());
  } catch {
    cache = { version: 2, workflows: {} };
  }
  if (cache.version < 2) {
    cache.version = 2;
    cacheWasUpgraded = true;
  }

  const cached = cache.workflows[key];
  if (cached && cache.version >= 2 && now - cached.cachedAt < WORKFLOW_STAGES_CACHE_TTL_MS) {
    if (cacheWasUpgraded) {
      try {
        await Bun.write(
          `${getCacheDir()}/${WORKFLOW_STAGES_CACHE_FILE}`,
          `${JSON.stringify(cache, null, 2)}\n`,
        );
      } catch (error) {
        logError("teamwork", "workflowStages.cacheWrite.error", "Failed to write upgraded cache", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return new Map(Object.entries(cached.stages).map(([id, entry]) => [Number(id), entry]));
  }

  let parsed: z.infer<typeof WorkflowResponseSchema>;
  try {
    parsed = WorkflowResponseSchema.parse(
      await fetchTeamworkApiJson(`/workflows/${workflowId}.json?include=stages`),
    );
  } catch (error) {
    logError(
      "teamwork",
      "workflowStages.fetch.error",
      `Failed to fetch workflow stages for ${workflowId}`,
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    throw error;
  }

  const stageData: Record<string, { name: string; color: string | null }> = {};
  const stages = new Map<number, { name: string; color: string | null }>();
  for (const stage of Object.values(parsed.included?.stages ?? {})) {
    const name = stage.name?.trim();
    if (name) {
      const entry = { name, color: stage.color?.trim() || null };
      stageData[stage.id.toString()] = entry;
      stages.set(stage.id, entry);
    }
  }

  cache.workflows[key] = { stages: stageData, cachedAt: now };
  try {
    await Bun.write(
      `${getCacheDir()}/${WORKFLOW_STAGES_CACHE_FILE}`,
      `${JSON.stringify(cache, null, 2)}\n`,
    );
  } catch (error) {
    logError(
      "teamwork",
      "workflowStages.cacheWrite.error",
      "Failed to persist workflow stages cache",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  return stages;
}
