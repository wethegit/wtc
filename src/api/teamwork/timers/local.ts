import { z } from "zod";

import { logError } from "../../logs/manager.ts";
import { getCacheDir } from "../../cache/consts.ts";
import { createTaskTimeEntry } from "../timers.ts";

const LOCAL_TIMERS_CACHE_FILE = "teamwork-local-timers.json";

const LocalTimerEntrySchema = z.object({
  id: z.string(),
  taskId: z.number(),
  taskName: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  status: z.enum(["running", "stopped"]),
});

const LocalTimersFileSchema = z.object({
  version: z.literal(1),
  timers: z.array(LocalTimerEntrySchema),
});

/** A locally-managed timer entry that has not been submitted to the Teamwork API yet. */
export type LocalTimerEntry = z.infer<typeof LocalTimerEntrySchema>;

function getLocalTimersPath(): string {
  return `${getCacheDir()}/${LOCAL_TIMERS_CACHE_FILE}`;
}

/** Loads all local timers from the cache file. Returns an empty array if the file is missing or corrupt. */
export async function loadLocalTimers(): Promise<LocalTimerEntry[]> {
  try {
    const parsed = LocalTimersFileSchema.parse(
      JSON.parse(await Bun.file(getLocalTimersPath()).text()),
    );
    return parsed.timers;
  } catch {
    return [];
  }
}

async function saveLocalTimers(timers: LocalTimerEntry[]): Promise<void> {
  const file = { version: 1, timers };
  try {
    await Bun.write(getLocalTimersPath(), `${JSON.stringify(file, null, 2)}\n`);
  } catch (error) {
    logError("teamwork", "localTimers.save.error", "Failed to save local timers", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Generates a unique local timer ID. */
function generateTimerId(): string {
  return crypto.randomUUID();
}

/** Returns the currently running timer from a list of entries, or null if none is running. */
export function getRunningTimer(timers: LocalTimerEntry[]): LocalTimerEntry | null {
  return timers.find((timer) => timer.status === "running") ?? null;
}

/** Returns elapsed milliseconds for a local timer, using `now` for running timers. */
export function getLocalTimerElapsedMs(timer: LocalTimerEntry, now: Date): number {
  const start = new Date(timer.startTime).getTime();
  const end = timer.endTime ? new Date(timer.endTime).getTime() : now.getTime();

  return Math.max(0, end - start);
}

/** Formats a timer duration as compact text for the TUI. */
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

/** Starts a local timer for the given task. If another timer is running, it is stopped first. Returns the new timer entry. */
export async function startLocalTimer(
  taskId: number,
  taskName: string,
): Promise<{ timer: LocalTimerEntry; stoppedPrevious: boolean }> {
  const timers = await loadLocalTimers();
  const running = getRunningTimer(timers);
  let stoppedPrevious = false;

  if (running) {
    running.endTime = new Date().toISOString();
    running.status = "stopped";
    stoppedPrevious = true;
  }

  const timer: LocalTimerEntry = {
    id: generateTimerId(),
    taskId,
    taskName,
    startTime: new Date().toISOString(),
    endTime: null,
    status: "running",
  };

  timers.push(timer);
  await saveLocalTimers(timers);

  return { timer, stoppedPrevious };
}

/** Stops the currently running timer. Returns the stopped entry or null if no timer was running. */
export async function stopLocalTimer(): Promise<LocalTimerEntry | null> {
  const timers = await loadLocalTimers();
  const running = getRunningTimer(timers);

  if (!running) return null;

  running.endTime = new Date().toISOString();
  running.status = "stopped";
  await saveLocalTimers(timers);

  return running;
}

/** Removes a local timer by ID without submitting. */
export async function removeLocalTimer(id: string): Promise<void> {
  const timers = await loadLocalTimers();
  await saveLocalTimers(timers.filter((timer) => timer.id !== id));
}

/** Result metadata from a successful local-timer submission. */
export interface SubmitLocalTimerResult {
  taskName: string;
  taskId: number;
  elapsedMs: number;
}

/**
 * Stops the timer if running, creates a Teamwork time entry, and removes the
 * local timer. Throws if the timer vanishes mid-stop.
 */
export async function submitLocalTimer(timer: LocalTimerEntry): Promise<SubmitLocalTimerResult> {
  const timerToSubmit = timer.status === "running" ? await stopLocalTimer() : timer;
  if (!timerToSubmit) {
    throw new Error("No timer found to submit.");
  }

  const elapsedMs = getLocalTimerElapsedMs(timerToSubmit, new Date());
  const totalMinutes = Math.max(1, Math.ceil(elapsedMs / 60_000));

  try {
    await createTaskTimeEntry({
      taskId: timerToSubmit.taskId,
      date: timerToSubmit.startTime.slice(0, 10),
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      description: timerToSubmit.taskName,
    });
  } catch (error) {
    logError("teamwork", "localTimers.submit.error", "Failed to submit time entry", {
      taskId: timerToSubmit.taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  await removeLocalTimer(timerToSubmit.id);
  return { taskName: timerToSubmit.taskName, taskId: timerToSubmit.taskId, elapsedMs };
}
