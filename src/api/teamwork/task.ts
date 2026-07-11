import { z } from "zod";

import { logError } from "../logs/manager.ts";
import { fetchTeamworkApiJson } from "./client.ts";

const TeamworkIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform(Number),
]);

const TeamworkRelationshipSchema = z.looseObject({
  id: TeamworkIdSchema.optional(),
});

const TeamworkTaskByIdResponseSchema = z.looseObject({
  task: z.looseObject({
    id: TeamworkIdSchema,
    projectId: TeamworkIdSchema.optional(),
    project: TeamworkRelationshipSchema.nullish(),
    name: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
  }),
});

export interface TeamworkTaskSummary {
  id: number;
  projectId: number | null;
  name: string;
}

/** Fetches a single Teamwork task by ID without requiring project metadata. */
export async function getTeamworkTaskSummaryById(taskId: number): Promise<TeamworkTaskSummary> {
  try {
    const searchParams = new URLSearchParams({
      "fields[tasks]": "id,name,title,content,projectId,project",
    });
    const parsed = TeamworkTaskByIdResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasks/${taskId}.json?${searchParams}`),
    );
    const name = parsed.task.name ?? parsed.task.title ?? parsed.task.content;
    if (!name) throw new Error("Teamwork task response did not include a task name.");

    return {
      id: parsed.task.id,
      projectId: parsed.task.projectId ?? parsed.task.project?.id ?? null,
      name,
    };
  } catch (error) {
    logError("teamwork", "task.getSummaryById.error", `Failed to fetch task ${taskId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Fetches a single Teamwork task by ID and returns its id and name. */
export async function getTeamworkTaskById(
  taskId: number,
): Promise<{ id: number; projectId: number; name: string }> {
  const task = await getTeamworkTaskSummaryById(taskId);
  if (!task.projectId) {
    const error = new Error("Teamwork task response did not include a project ID.");
    logError("teamwork", "task.getById.error", `Failed to fetch task ${taskId}`, {
      error: error.message,
    });
    throw error;
  }

  return { id: task.id, projectId: task.projectId, name: task.name };
}
