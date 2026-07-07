import { z } from "zod";

import { logError, logInfo, logWarn } from "../../logs/manager.ts";
import { fetchTeamworkApiJson, TeamworkApiError } from "../client.ts";

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
  timeLogId: TeamworkIdSchema.optional(),
  timelog: TeamworkRelationshipSchema.nullish(),
  task: TeamworkRelationshipSchema.nullish(),
  project: TeamworkRelationshipSchema.nullish(),
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

async function fetchTimerApiJson(path: string, init?: RequestInit): Promise<unknown> {
  try {
    return await fetchTeamworkApiJson(path, init);
  } catch (error) {
    if (!(error instanceof TeamworkApiError) || error.status !== 503) throw error;
    logWarn("teamwork", "timers.request.retry", "Retrying Teamwork timer request after 503", {
      method: init?.method ?? "GET",
      path,
      status: error.status,
      body: error.body,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    return await fetchTeamworkApiJson(path, init);
  }
}

function getTimerErrorMessage(
  error: unknown,
  fallback: string,
  unavailableMessage = "Teamwork is temporarily unavailable. Please try again.",
): string {
  if (error instanceof TeamworkApiError && error.status === 503) return unavailableMessage;
  return error instanceof z.ZodError ? "Unexpected Teamwork timer response." : fallback;
}

function getTimerLogMetadata(timer: TeamworkTimer): Record<string, unknown> {
  const firstInterval = timer.intervals[0] ?? null;
  const lastInterval = timer.intervals.at(-1) ?? null;

  return {
    timerId: timer.id,
    userId: timer.userId,
    taskId: timer.taskId,
    projectId: timer.projectId,
    timeLogId: timer.timeLogId,
    running: timer.running,
    billable: timer.billable,
    deleted: timer.deleted,
    duration: timer.duration,
    lastStartedAt: timer.lastStartedAt,
    serverTime: timer.serverTime,
    intervalCount: timer.intervals.length,
    firstInterval,
    lastInterval,
  };
}

/**
 * A timer managed by the Teamwork native timer API.
 * `duration` is the server-provided accumulated duration in seconds.
 */
export interface TeamworkTimer {
  id: number;
  userId: number | null;
  taskId: number | null;
  projectId: number | null;
  timeLogId: number | null;
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
  // Teamwork's complete response can mark a timer deleted while still echoing running: true.
  const running = timer.deleted ? false : timer.running;

  return {
    id: timer.id,
    userId: timer.userId ?? null,
    taskId,
    projectId,
    timeLogId: timer.timeLogId ?? timer.timelog?.id ?? null,
    taskName: getIncludedName(included?.tasks, taskId),
    projectName: getIncludedName(included?.projects, projectId),
    description: timer.description ?? null,
    running,
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
      await fetchTimerApiJson(`/me/timers.json?${searchParams}`),
    );
    return data.timers
      .map((timer) => normalizeTimer(timer, data.included))
      .filter((timer) => !timer.deleted);
  } catch (error) {
    logError("teamwork", "timers.getMy.error", "Failed to fetch timers", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      getTimerErrorMessage(
        error,
        error instanceof Error ? error.message : String(error),
        "Teamwork is temporarily unavailable while loading timers. Please try again.",
      ),
    );
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
      await fetchTimerApiJson("/me/timers.json", {
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
    throw new Error(
      getTimerErrorMessage(
        error,
        error instanceof Error ? error.message : String(error),
        "Teamwork is temporarily unavailable while starting the timer. Please try again.",
      ),
    );
  }
}

async function setTimerMinimumDuration(
  timerId: number,
  minSeconds: number,
): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTimerApiJson(`/me/timers/${timerId}.json`, {
        method: "PUT",
        body: JSON.stringify({ timer: { seconds: minSeconds } }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.updateDuration.error", "Failed to update timer duration", {
      timerId,
      minSeconds,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      getTimerErrorMessage(error, error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function stopTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTimerApiJson(`/me/timers/${timerId}/pause.json`, { method: "PUT" }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.stop.error", "Failed to pause timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      getTimerErrorMessage(error, error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function resumeTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTimerApiJson(`/me/timers/${timerId}/resume.json`, { method: "PUT" }),
    );
    return normalizeTimer(data.timer, data.included);
  } catch (error) {
    logError("teamwork", "timers.resume.error", "Failed to resume timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      getTimerErrorMessage(error, error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function completeTimer(timerId: number): Promise<TeamworkTimer> {
  const path = `/me/timers/${timerId}/complete.json`;
  logInfo("teamwork", "timers.complete.start", "Completing Teamwork timer", {
    timerId,
    method: "PUT",
    path,
  });

  try {
    const data = TeamworkTimerResponseSchema.parse(
      await fetchTimerApiJson(path, { method: "PUT" }),
    );
    const timer = normalizeTimer(data.timer, data.included);
    logInfo(
      "teamwork",
      "timers.complete.success",
      "Completed Teamwork timer",
      getTimerLogMetadata(timer),
    );
    return timer;
  } catch (error) {
    logError("teamwork", "timers.complete.error", "Failed to complete timer", {
      timerId,
      method: "PUT",
      path,
      status: error instanceof TeamworkApiError ? error.status : null,
      body: error instanceof TeamworkApiError ? error.body : null,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof TeamworkApiError) {
      try {
        const searchParams = new URLSearchParams({
          include: "tasks,projects",
          showDeleted: "true",
        });
        const diagData = TeamworkTimerResponseSchema.parse(
          await fetchTimerApiJson(`/timers/${timerId}.json?${searchParams}`),
        );
        const diagTimer = normalizeTimer(diagData.timer, diagData.included);
        logInfo(
          "teamwork",
          "timers.complete.failureState",
          "Fetched timer state after complete failure",
          getTimerLogMetadata(diagTimer),
        );
      } catch (diagError) {
        if (diagError instanceof TeamworkApiError && diagError.status === 404) {
          logWarn(
            "teamwork",
            "timers.complete.failureStateMissing",
            "Timer missing after complete failure",
            { timerId },
          );
        } else {
          logError(
            "teamwork",
            "timers.complete.failureState.error",
            "Failed to fetch timer state after complete failure",
            {
              timerId,
              error: diagError instanceof Error ? diagError.message : String(diagError),
            },
          );
        }
      }
      throw error;
    }

    throw new Error(
      getTimerErrorMessage(
        error,
        error instanceof Error ? error.message : String(error),
        "Teamwork is temporarily unavailable while submitting the timer. Please try again.",
      ),
    );
  }
}

/** Submits a timer through Teamwork's native complete endpoint.
 *
 * Pauses first so the server finalises the duration, then checks whether it is
 * at least 1 minute.  Teamwork's complete endpoint returns 503 when the
 * accumulated time is too short (< 60 s) so we extend it when necessary. */
export async function submitTimer(timer: TeamworkTimer): Promise<TeamworkTimer> {
  logInfo(
    "teamwork",
    "timers.submit.start",
    "Submitting Teamwork timer via native complete endpoint",
    getTimerLogMetadata(timer),
  );

  try {
    const pausedTimer = timer.running ? await stopTimer(timer.id) : timer;

    const elapsedMs = getTimerElapsedMs(pausedTimer, new Date());
    const timerToComplete =
      elapsedMs < 60_000 ? await setTimerMinimumDuration(pausedTimer.id, 60) : pausedTimer;

    if (elapsedMs < 60_000) {
      logInfo(
        "teamwork",
        "timers.submit.durationExtended",
        "Timer duration was less than 1 minute, extended to 60 s before completing",
        getTimerLogMetadata(timerToComplete),
      );
    }

    return await completeTimer(timerToComplete.id);
  } catch (error) {
    logError("teamwork", "timers.submit.error", "Failed to submit Teamwork timer", {
      ...getTimerLogMetadata(timer),
      status: error instanceof TeamworkApiError ? error.status : null,
      body: error instanceof TeamworkApiError ? error.body : null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      error instanceof z.ZodError
        ? "Unexpected Teamwork timer response."
        : error instanceof TeamworkApiError && error.status === 503
          ? "Teamwork returned an internal error while submitting the timer. Check logs for complete request diagnostics."
          : error instanceof Error
            ? error.message
            : "Failed to submit timer.",
    );
  }
}

export async function deleteTimer(timerId: number, hardDelete = true): Promise<void> {
  try {
    const request: RequestInit = {
      method: "DELETE",
      body: JSON.stringify({ hardDelete: Boolean(hardDelete) }),
      headers: { "Content-Type": "application/json" },
    };

    await fetchTimerApiJson(`/me/timers/${timerId}.json`, request);
  } catch (error) {
    logError("teamwork", "timers.delete.error", "Failed to delete timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      getTimerErrorMessage(
        error,
        error instanceof Error ? error.message : String(error),
        "Teamwork is temporarily unavailable while deleting the timer. Please try again.",
      ),
    );
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
