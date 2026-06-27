import { TEAMWORK_TIMESHEET_URL } from "../../api/teamwork/consts.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import {
  getLocalTimerElapsedMs,
  formatTimerDuration,
  submitLocalTimer,
  loadLocalTimers,
  startLocalTimer as startLocalTimerImpl,
  stopLocalTimer,
  removeLocalTimer,
} from "../../api/teamwork/timers/local.ts";
import type { LocalTimerEntry } from "../../api/teamwork/timers/local.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";

function findTimerByTaskId(
  timers: readonly LocalTimerEntry[],
  taskId: number,
): LocalTimerEntry | null {
  const matches = timers.filter((t) => t.taskId === taskId);
  if (matches.length === 0) return null;

  const running = matches.find((t) => t.status === "running");
  if (running) return running;

  return (
    matches.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] ??
    null
  );
}

/**
 * Formats existing timers as a hint block appended to "no timer found" messages.
 *
 * Example output:
 * ```
 * Existing timers:
 *   General | Code Review (#1) — 1h 23m — running ⏱
 *   Update README (#2) — 30m — stopped
 * ```
 */
function formatExistingTimersHint(timers: readonly LocalTimerEntry[]): string {
  if (timers.length === 0) return "";
  const now = new Date();
  const lines = timers.map((t) => `  ${formatTimerEntry(t, now)}`);
  return `\nExisting timers:\n${lines.join("\n")}`;
}

/**
 * Formats a single timer entry line for display.
 *
 * Example output:
 * ```
 * General | Code Review (#1597639) — 1h 23m — running ⏱
 * ```
 */
function formatTimerEntry(timer: LocalTimerEntry, now: Date): string {
  const elapsed = getLocalTimerElapsedMs(timer, now);
  const duration = formatTimerDuration(elapsed);
  const statusSymbol = timer.status === "running" ? " ⏱" : "";
  return `${timer.taskName} (#${timer.taskId}) — ${duration} — ${timer.status}${statusSymbol}`;
}

/**
 * Formats the full timer list for CLI display.
 *
 * Running timers are sorted to the top, then sorted by most recent start time.
 *
 * Example output:
 * ```
 * Local timers:
 *   General | Code Review (#1) — 1h 23m — running ⏱
 *   Update README (#2) — 30m — stopped
 * ```
 */
export function formatTimerListOutput(
  timers: readonly LocalTimerEntry[],
  options: { json: boolean },
): string {
  if (options.json) return JSON.stringify(timers, null, 2);

  const now = new Date();
  if (!timers.length) return "No local timers.";

  const sorted = [...timers].sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const lines = ["Local timers:"];
  for (const timer of sorted) {
    lines.push(`  ${formatTimerEntry(timer, now)}`);
  }
  return lines.join("\n");
}

export async function teamworkTimerList(args: { json: boolean }): Promise<void> {
  const timers = await loadLocalTimers();
  console.log(formatTimerListOutput(timers, { json: args.json }));
}

export async function teamworkTimerStart(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const task = await getTeamworkTaskById(ref.id);
  await startLocalTimerImpl(task.id, task.name);
  console.log(`Timer started for: ${task.name} (#${task.id})`);
}

export async function teamworkTimerStop(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await loadLocalTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No local timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  if (match.status !== "running") {
    console.log(`Timer already stopped for: ${match.taskName} (#${match.taskId})`);
    return;
  }

  await stopLocalTimer();
  console.log(`Timer stopped for: ${match.taskName} (#${match.taskId})`);
}

export async function teamworkTimerSubmit(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await loadLocalTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No local timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  try {
    const result = await submitLocalTimer(match);
    console.log(`Timer submitted for: ${result.taskName} (#${result.taskId})`);
  } catch (error) {
    console.log(error instanceof Error ? error.message : "No timer found to submit.");
  }
}

export async function teamworkTimerDiscard(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await loadLocalTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No local timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  const taskTimers = timers.filter((t) => t.taskId === ref.id);
  if (taskTimers.length > 1) {
    console.log(
      `Multiple local timers found for task #${ref.id}. Keep only one timer for this task before submitting or discarding.`,
    );
    return;
  }

  await removeLocalTimer(match.id);
  console.log(`Timer discarded for: ${match.taskName} (#${match.taskId})`);
}

export async function teamworkTimesheetOpen(): Promise<void> {
  await openUrlInBrowser(TEAMWORK_TIMESHEET_URL);
  console.log(`Opened Teamwork timesheet: ${TEAMWORK_TIMESHEET_URL}`);
}
