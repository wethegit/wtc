import { z } from "zod";

import { logError } from "../logs/manager.ts";
import { fetchTeamworkApiJson } from "./client.ts";

const TeamworkTaskByIdResponseSchema = z.object({
  task: z.object({
    id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]),
    name: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
  }),
});

/** Fetches a single Teamwork task by ID and returns its id and name. */
export async function getTeamworkTaskById(taskId: number): Promise<{ id: number; name: string }> {
  try {
    const parsed = TeamworkTaskByIdResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasks/${taskId}.json`),
    );
    const name = parsed.task.name ?? parsed.task.title ?? parsed.task.content;
    if (!name) throw new Error("Teamwork task response did not include a task name.");

    return { id: parsed.task.id, name };
  } catch (error) {
    logError("teamwork", "task.getById.error", `Failed to fetch task ${taskId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
