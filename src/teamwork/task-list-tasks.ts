import { z } from "zod";

import { fetchTeamworkApiJson } from "./client.ts";

const TeamworkTaskApiSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]),
  name: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.string().optional(),
  url: z.string().optional(),
});

const TeamworkTaskListTasksResponseSchema = z.object({
  tasks: z.array(TeamworkTaskApiSchema),
});

export interface TeamworkTask {
  /** Teamwork task ID. */
  id: number;
  /** Human-readable task name shown in WTC. */
  name: string;
  /** Optional Teamwork task status when the API includes it. */
  status: string | null;
  /** Optional browser URL when the API includes it. */
  url: string | null;
}

export async function getTeamworkTaskListTasks(taskListId: number): Promise<TeamworkTask[]> {
  const parsed = TeamworkTaskListTasksResponseSchema.parse(
    await fetchTeamworkApiJson(`/tasklists/${taskListId}/tasks.json`),
  );

  const tasks: TeamworkTask[] = [];
  for (const task of parsed.tasks) {
    const name = task.name ?? task.title ?? task.content;
    if (!name) throw new Error("Teamwork task response did not include a task name.");

    tasks.push({
      id: task.id,
      name,
      status: task.status ?? null,
      url: task.url ?? null,
    });
  }

  return tasks;
}
