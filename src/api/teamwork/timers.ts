import { z } from "zod";

import { logError } from "../logs/manager.ts";
import { fetchTeamworkApiJson } from "./client.ts";

const TeamworkTaskTimeEntryInputSchema = z.object({
  taskId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().int().nonnegative(),
  minutes: z.number().int().min(0).max(59),
  description: z.string(),
});

const TeamworkTaskTimeEntryResponseSchema = z.object({
  timelog: z.object({
    id: z.number().int().positive(),
  }),
});

/** Fields needed to create a Teamwork time entry linked to a task. */
export type TeamworkTaskTimeEntryInput = z.infer<typeof TeamworkTaskTimeEntryInputSchema>;

/** Creates a submitted Teamwork time entry for a task. */
export async function createTaskTimeEntry(input: TeamworkTaskTimeEntryInput): Promise<number> {
  try {
    const parsedInput = TeamworkTaskTimeEntryInputSchema.parse(input);
    const parsed = TeamworkTaskTimeEntryResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasks/${parsedInput.taskId}/time.json`, {
        method: "POST",
        body: JSON.stringify({
          timelog: {
            taskId: parsedInput.taskId,
            isUtc: true,
            date: parsedInput.date,
            hours: parsedInput.hours,
            minutes: parsedInput.minutes,
            description: parsedInput.description,
          },
          timelogOptions: {},
          tags: [],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    return parsed.timelog.id;
  } catch (error) {
    logError("teamwork", "timers.create.error", "Failed to create time entry", {
      taskId: input.taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
