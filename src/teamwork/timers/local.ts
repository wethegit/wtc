import { getCacheDir } from "../../state/consts.ts";

const LOCAL_TIMERS_CACHE_FILE = "teamwork-local-timers.json";

/** A locally-managed timer entry that has not been submitted to the Teamwork API yet. */
export interface LocalTimerEntry {
  id: string;
  taskId: number;
  taskName: string;
  startTime: string;
  endTime: string | null;
  status: "running" | "stopped";
}

interface LocalTimersFile {
  version: 1;
  timers: LocalTimerEntry[];
}

function getLocalTimersPath(): string {
  return `${getCacheDir()}/${LOCAL_TIMERS_CACHE_FILE}`;
}

/** Loads all local timers from the cache file. Returns an empty array if the file is missing or corrupt. */
export async function loadLocalTimers(): Promise<LocalTimerEntry[]> {
  try {
    const parsed = JSON.parse(await Bun.file(getLocalTimersPath()).text()) as LocalTimersFile;

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.timers)) return [];

    return parsed.timers;
  } catch {
    return [];
  }
}

async function saveLocalTimers(timers: LocalTimerEntry[]): Promise<void> {
  const file: LocalTimersFile = { version: 1, timers };
  await Bun.write(getLocalTimersPath(), `${JSON.stringify(file, null, 2)}\n`);
}

/** Generates a unique local timer ID. */
function generateTimerId(): string {
  return crypto.randomUUID();
}

/** Returns the currently running timer from a list of entries, or null if none is running. */
export function getRunningTimer(timers: LocalTimerEntry[]): LocalTimerEntry | null {
  return timers.find((timer) => timer.status === "running") ?? null;
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
