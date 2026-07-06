import { z } from "zod";

import { logError } from "../../logs/manager.ts";
import { fetchTeamworkApiJson } from "../client.ts";

const TeamworkIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/).transform(Number),
]);

const TeamworkRelationshipSchema = z.looseObject({
  id: TeamworkIdSchema.optional(),
});

const TeamworkIncludedNamedEntitySchema = z.looseObject({
  id: TeamworkIdSchema.optional(),
  name: z.string().optional(),
  title: z.string().optional(),
});

const TeamworkTimerIntervalApiSchema = z.looseObject({
  id: TeamworkIdSchema,
  from: z.string(),
  to: z.string().nullable().optional(),
  duration: z.number(),
});

const TeamworkTimerApiSchema = z.looseObject({
  id: TeamworkIdSchema,
  userId: TeamworkIdSchema.optional(),
  taskId: TeamworkIdSchema.optional(),
  projectId: TeamworkIdSchema.optional(),
  task: TeamworkRelationshipSchema.optional(),
  project: TeamworkRelationshipSchema.optional(),
  description: z.string().nullable().optional(),
  running: z.boolean(),
  billable: z.boolean(),
  deleted: z.boolean(),
  lastStartedAt: z.string(),
  serverTime: z.string(),
  duration: z.number(),
  intervals: z.array(TeamworkTimerIntervalApiSchema),
});

const TeamworkTimersIncludedSchema = z.looseObject({
  tasks: z.record(z.string(), TeamworkIncludedNamedEntitySchema).optional(),
  projects: z.record(z.string(), TeamworkIncludedNamedEntitySchema).optional(),
});

const TeamworkTimersListResponseSchema = z.object({
  timers: z.array(TeamworkTimerApiSchema),
  included: TeamworkTimersIncludedSchema.optional(),
});

const TeamworkTimerResponseSchema = z.object({
  timer: TeamworkTimerApiSchema,
  included: TeamworkTimersIncludedSchema.optional(),
});

type TeamworkTimerApi = z.infer<typeof TeamworkTimerApiSchema>;
type TeamworkTimersIncluded = z.infer<typeof TeamworkTimersIncludedSchema>;

/**
 * A timer managed by the Teamwork native timer API.
 * `duration` is the server-provided accumulated duration in seconds.
 */
export interface TeamworkTimer {
  id: number;
  userId: number | null;
  taskId: number | null;
  projectId: number | null;
  taskName: string | null;
  projectName: string | null;
  description: string | null;
  running: boolean;
  billable: boolean;
  deleted: boolean;
  lastStartedAt: string;
  serverTime: string;
  duration: number;
  intervals: TeamworkTimerInterval[];
}

export interface TeamworkTimerInterval {
  id: number;
  from: string;
  to: string | null;
  duration: number;
}

function getIncludedName(
  values: Record<string, z.infer<typeof TeamworkIncludedNamedEntitySchema>> | undefined,
  id: number | null,
): string | null {
  if (id === null || !values) return null;
  const value = values[id.toString()] ?? Object.values(values).find((entry) => entry.id === id);
  return value?.name?.trim() || value?.title?.trim() || null;
}

function normalizeTimer(timer: TeamworkTimerApi, included: TeamworkTimersIncluded | undefined) {
  const taskId = timer.taskId ?? timer.task?.id ?? null;
  const projectId = timer.projectId ?? timer.project?.id ?? null;

  return {
    id: timer.id,
    userId: timer.userId ?? null,
    taskId,
    projectId,
    taskName: getIncludedName(included?.tasks, taskId),
    projectName: getIncludedName(included?.projects, projectId),
    description: timer.description ?? null,
    running: timer.running,
    billable: timer.billable,
    deleted: timer.deleted,
    lastStartedAt: timer.lastStartedAt,
    serverTime: timer.serverTime,
    duration: timer.duration,
    intervals: timer.intervals.map((interval) => ({
      id: interval.id,
      from: interval.from,
      to: interval.to?.trim() ? interval.to : null,
      duration: interval.duration,
    })),
  } satisfies TeamworkTimer;
}

/** Fetches timers for the authenticated user. */
export async function getMyTimers(params?: {
  taskId?: number;
  projectId?: number;
  runningTimersOnly?: boolean;
}): Promise<TeamworkTimer[]> {
  try {
    const searchParams = new URLSearchParams({ include: "tasks,projects" });
    if (params?.taskId) searchParams.set("taskId", String(params.taskId));
    if (params?.projectId) searchParams.set("projectId", String(params.projectId));
    if (params?.runningTimersOnly) searchParams.set("runningTimersOnly", "true");
    const data = TeamworkTimersListResponseSchema.parse(
      await fetchTeamworkApiJson(`/me/timers.json?${searchParams}`),
    );
    return data.timers.map((timer) => normalizeTimer(timer, data.included));
  } catch (error) {
    logError("teamwork", "timers.getMy.error", "Failed to fetch timers", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Starts a new timer for the given task.
 * Teamwork pauses any currently running timer by default when a new one starts.
 */
export async function startTimer(input: {
  projectId: number;
  taskId: number;
  description?: string;
}): Promise<TeamworkTimer> {
  try {
    const timer: {
      projectId: number;
      taskId: number;
      description?: string;
      isRunning: boolean;
      stopRunningTimers: boolean;
    } = {
      projectId: input.projectId,
      taskId: input.taskId,
      isRunning: true,
      stopRunningTimers: true,
    };
    if (input.description) timer.description = input.description;

    const data = TeamworkTimerResponseSchema.parse(
      await fetchTeamworkApiJson("/me/timers.json", {
        method: "POST",
        body: JSON.stringify({ timer }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.start.error", "Failed to start timer", {
      taskId: input.taskId,
      projectId: input.projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Pauses a running timer by ID. */
export async function stopTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTeamworkApiJson(`/me/timers/${timerId}/pause.json`, { method: "PUT" }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.stop.error", "Failed to pause timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Resumes an existing timer by ID, pausing other running timers server-side. */
export async function resumeTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTeamworkApiJson(`/me/timers/${timerId}/resume.json`, { method: "PUT" }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.resume.error", "Failed to resume timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Completes a timer, creating the Teamwork timelog entry and deleting the timer. */
export async function completeTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTeamworkApiJson(`/me/timers/${timerId}/complete.json`, { method: "PUT" }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.complete.error", "Failed to complete timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Deletes a timer by ID. Hard delete removes it entirely; soft delete (default) just marks it as deleted. */
export async function deleteTimer(timerId: number, hardDelete?: boolean): Promise<void> {
  try {
    await fetchTeamworkApiJson(`/me/timers/${timerId}.json`, {
      method: "DELETE",
      body: JSON.stringify({ hardDelete: Boolean(hardDelete) }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logError("teamwork", "timers.delete.error", "Failed to delete timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Calculates elapsed milliseconds for a timer.
 * Stopped timers use accumulated server duration; running timers add the current interval locally.
 */
export function getTimerElapsedMs(timer: TeamworkTimer, now: Date): number {
  const accumulatedMs = timer.duration * 1000;
  if (!timer.running) return accumulatedMs;

  const start = new Date(timer.lastStartedAt).getTime();
  if (!Number.isFinite(start)) return accumulatedMs;
  return accumulatedMs + Math.max(0, now.getTime() - start);
}

/** Formats a timer duration as compact text for display. */
export function formatTimerDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
      .toString()
      .padStart(2, "0")}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
