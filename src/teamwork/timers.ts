/**
 * Teamwork API layer for timers.
 *
 * These functions call the Teamwork API directly and are reserved for the
 * explicit submit action (sending completed local timers to Teamwork).
 * Start/stop actions in the TUI use the local timer manager instead.
 */

import { fetchTeamworkApiJson } from "./client.ts";

/** A Teamwork timer for the current user. */
export interface TeamworkTimer {
  id: number;
  running: boolean;
  description: string;
  taskId: number | null;
  projectId: number | null;
  duration: number;
  lastStartedAt: string | null;
}

/** Starts a timer for the given task. Returns the new timer. */
export async function startTimer(taskId: number): Promise<TeamworkTimer> {
  const root = await fetchTeamworkApiJson("/me/timers.json", {
    method: "POST",
    body: JSON.stringify({ timer: { taskId } }),
    headers: { "Content-Type": "application/json" },
  });

  const parsed = root as Record<string, unknown>;
  const timer = parsed?.timer as Record<string, unknown> | undefined;
  if (!timer || typeof timer.id !== "number") {
    throw new Error("Teamwork timer response did not include a timer.");
  }

  return {
    id: timer.id,
    running: !!timer.running,
    description: typeof timer.description === "string" ? timer.description : "",
    taskId: typeof timer.taskId === "number" ? timer.taskId : null,
    projectId: typeof timer.projectId === "number" ? timer.projectId : null,
    duration: typeof timer.duration === "number" ? timer.duration : 0,
    lastStartedAt: typeof timer.lastStartedAt === "string" ? timer.lastStartedAt : null,
  };
}

/** Pauses a running timer by ID. Returns the paused timer. */
export async function pauseTimer(timerId: number): Promise<TeamworkTimer> {
  const root = await fetchTeamworkApiJson(`/me/timers/${timerId}/pause.json`, {
    method: "PUT",
  });

  const parsed = root as Record<string, unknown>;
  const timer = parsed?.timer as Record<string, unknown> | undefined;
  if (!timer || typeof timer.id !== "number") {
    throw new Error("Teamwork timer pause response did not include a timer.");
  }

  return {
    id: timer.id,
    running: !!timer.running,
    description: typeof timer.description === "string" ? timer.description : "",
    taskId: typeof timer.taskId === "number" ? timer.taskId : null,
    projectId: typeof timer.projectId === "number" ? timer.projectId : null,
    duration: typeof timer.duration === "number" ? timer.duration : 0,
    lastStartedAt: typeof timer.lastStartedAt === "string" ? timer.lastStartedAt : null,
  };
}

/** Lists timers for the current user. */
export async function getTimers(): Promise<TeamworkTimer[]> {
  const root = await fetchTeamworkApiJson("/me/timers.json");
  const parsed = root as Record<string, unknown>;
  const timers = parsed?.timers;
  if (!Array.isArray(timers)) {
    throw new Error("Teamwork timers response did not include a timers array.");
  }

  return timers.map((timer: Record<string, unknown>) => ({
    id: typeof timer.id === "number" ? timer.id : 0,
    running: !!timer.running,
    description: typeof timer.description === "string" ? timer.description : "",
    taskId: typeof timer.taskId === "number" ? timer.taskId : null,
    projectId: typeof timer.projectId === "number" ? timer.projectId : null,
    duration: typeof timer.duration === "number" ? timer.duration : 0,
    lastStartedAt: typeof timer.lastStartedAt === "string" ? timer.lastStartedAt : null,
  }));
}
