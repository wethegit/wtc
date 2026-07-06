import { logError } from "../../logs/manager.ts";
import { fetchTeamworkApiJson } from "../client.ts";

/**
 * A timer managed by the Teamwork native timer API.
 * Running timers are tracked server-side; elapsed is calculated locally from `lastStartedAt`.
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
  id: string;
  from: string;
  to: string | null;
  duration: number;
}

/** Fetches timers for the authenticated user. */
export async function getMyTimers(params?: {
  taskId?: number;
  projectId?: number;
  runningTimersOnly?: boolean;
}): Promise<TeamworkTimer[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.set("taskId", String(params.taskId));
    if (params?.projectId) searchParams.set("projectId", String(params.projectId));
    if (params?.runningTimersOnly) searchParams.set("runningTimersOnly", "true");
    const qs = searchParams.toString();
    const path = qs ? `/me/timers.json?${qs}` : "/me/timers.json";
    const data = (await fetchTeamworkApiJson(path)) as { timers: TeamworkTimer[] };
    return data.timers ?? [];
  } catch (error) {
    logError("teamwork", "timers.getMy.error", "Failed to fetch timers", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Starts a new timer for the given task.
 * Auto-stops any currently running timer (server-side behavior).
 */
export async function startTimer(taskId: number, description?: string): Promise<TeamworkTimer> {
  try {
    const timer: { taskId: number; description?: string } = { taskId };
    if (description) timer.description = description;
    const body = { timer };
    const data = (await fetchTeamworkApiJson("/me/timers.json", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })) as { timer: TeamworkTimer };
    return data.timer;
  } catch (error) {
    logError("teamwork", "timers.start.error", "Failed to start timer", {
      taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Stops a running timer by ID. */
export async function stopTimer(timerId: number): Promise<TeamworkTimer> {
  try {
    const data = (await fetchTeamworkApiJson(`/timers/${timerId}.json`, {
      method: "PUT",
      body: JSON.stringify({ timer: { running: false } }),
      headers: { "Content-Type": "application/json" },
    })) as { timer: TeamworkTimer };
    return data.timer;
  } catch (error) {
    logError("teamwork", "timers.stop.error", "Failed to stop timer", {
      timerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Deletes a timer by ID. Hard delete removes it entirely; soft delete (default) just marks it as deleted. */
export async function deleteTimer(timerId: number, hardDelete?: boolean): Promise<void> {
  try {
    const body = hardDelete ? JSON.stringify({ hardDelete: true }) : undefined;
    await fetchTeamworkApiJson(`/me/timers/${timerId}.json`, {
      method: "DELETE",
      body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
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
 * For stopped timers, returns the server-provided accumulated duration.
 * For running timers, returns accumulated duration plus the current interval elapsed.
 */
export function getTimerElapsedMs(timer: TeamworkTimer, now: Date): number {
  // Convert server duration (in minutes) to milliseconds
  const accumulatedMs = timer.duration * 60 * 1000;

  // If timer is stopped, return only the accumulated duration
  if (!timer.running) {
    return accumulatedMs;
  }

  // If timer is running, add the current interval's elapsed time
  if (!timer.lastStartedAt) return accumulatedMs;
  const start = new Date(timer.lastStartedAt).getTime();
  const currentIntervalMs = Math.max(0, now.getTime() - start);
  return accumulatedMs + currentIntervalMs;
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
