import { z } from "zod";

import { getCacheDir } from "../state/consts.ts";
import { fetchTeamworkApiJson } from "./client.ts";

const WORKFLOW_STAGES_CACHE_FILE = "teamwork-workflow-stages.json";
const WORKFLOW_STAGES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const StageSchema = z.object({
  id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  name: z.string().optional(),
});

const WorkflowResponseSchema = z.object({
  included: z
    .object({
      stages: z.record(z.string(), StageSchema).optional(),
    })
    .optional(),
});

interface WorkflowStagesCacheEntry {
  stages: Record<string, string>;
  cachedAt: number;
}

interface WorkflowStagesCacheFile {
  version: 1;
  workflows: Record<string, WorkflowStagesCacheEntry>;
}

/** Fetches workflow stage names from Teamwork, cached on disk for 7 days. */
export async function getWorkflowStageNames(workflowId: number): Promise<Map<number, string>> {
  const key = workflowId.toString();
  const now = Date.now();
  let cache: WorkflowStagesCacheFile;

  try {
    cache = JSON.parse(await Bun.file(`${getCacheDir()}/${WORKFLOW_STAGES_CACHE_FILE}`).text());
  } catch {
    cache = { version: 1, workflows: {} };
  }

  const cached = cache.workflows[key];
  if (cached && now - cached.cachedAt < WORKFLOW_STAGES_CACHE_TTL_MS) {
    return new Map(Object.entries(cached.stages).map(([id, name]) => [Number(id), name]));
  }

  const parsed = WorkflowResponseSchema.parse(
    await fetchTeamworkApiJson(`/workflows/${workflowId}.json?include=stages`),
  );

  const stageNames: Record<string, string> = {};
  const stages = new Map<number, string>();
  for (const stage of Object.values(parsed.included?.stages ?? {})) {
    const name = stage.name?.trim();
    if (name) {
      stageNames[stage.id.toString()] = name;
      stages.set(stage.id, name);
    }
  }

  cache.workflows[key] = { stages: stageNames, cachedAt: now };
  await Bun.write(
    `${getCacheDir()}/${WORKFLOW_STAGES_CACHE_FILE}`,
    `${JSON.stringify(cache, null, 2)}\n`,
  );

  return stages;
}
