import { TEAMWORK_TIMESHEET_URL } from "../../api/teamwork/consts.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import {
  completeTimer,
  deleteTimer,
  getMyTimers,
  getTimerElapsedMs,
  formatTimerDuration,
  resumeTimer,
  startTimer,
  stopTimer,
  type TeamworkTimer,
} from "../../api/teamwork/timers/api.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";

function findTimerByTaskId(timers: readonly TeamworkTimer[], taskId: number): TeamworkTimer | null {
  const matches = timers.filter((t) => t.taskId === taskId);
  if (matches.length === 0) return null;

  const running = matches.find((t) => t.running);
  if (running) return running;

  return (
    matches.sort(
      (a, b) => new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime(),
    )[0] ?? null
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
function formatExistingTimersHint(timers: readonly TeamworkTimer[]): string {
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
function formatTimerEntry(timer: TeamworkTimer, now: Date): string {
  const elapsed = getTimerElapsedMs(timer, now);
  const duration = formatTimerDuration(elapsed);
  const statusSymbol = timer.running ? " ⏱" : "";
  const name = timer.taskName ?? (timer.taskId ? `Task #${timer.taskId}` : `Timer #${timer.id}`);
  const idLabel = timer.taskId ? `#${timer.taskId}` : `timer #${timer.id}`;
  return `${name} (${idLabel}) — ${duration} — ${timer.running ? "running" : "stopped"}${statusSymbol}`;
}

/**
 * Formats the full timer list for CLI display.
 *
 * Running timers are sorted to the top, then sorted by most recent start time.
 *
 * Example output:
 * ```
 * Timers:
 *   General | Code Review (#1) — 1h 23m — running ⏱
 *   Update README (#2) — 30m — stopped
 * ```
 */
function formatTimerListOutput(
  timers: readonly TeamworkTimer[],
  options: { json: boolean },
): string {
  if (options.json) return JSON.stringify(timers, null, 2);

  const now = new Date();
  if (!timers.length) return "No timers.";

  const sorted = [...timers].sort((a, b) => {
    if (a.running && !b.running) return -1;
    if (!a.running && b.running) return 1;
    return new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime();
  });

  const lines = ["Timers:"];
  for (const timer of sorted) {
    lines.push(`  ${formatTimerEntry(timer, now)}`);
  }
  return lines.join("\n");
}

export async function teamworkTimerList(args: { json: boolean }): Promise<void> {
  const timers = await getMyTimers();
  console.log(formatTimerListOutput(timers, { json: args.json }));
}

export async function teamworkTimerStart(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const task = await getTeamworkTaskById(ref.id);
  const timers = await getMyTimers({ taskId: task.id });
  const match = findTimerByTaskId(timers, task.id);

  if (match?.running) {
    console.log(`Timer already running for: ${match.taskName ?? task.name} (#${task.id})`);
    return;
  }

  if (match) {
    await resumeTimer(match.id);
  } else {
    await startTimer({ projectId: task.projectId, taskId: task.id, description: task.name });
  }
  console.log(`Timer started for: ${task.name} (#${task.id})`);
}

export async function teamworkTimerStop(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await getMyTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  if (!match.running) {
    console.log(
      `Timer already stopped for: ${match.taskName ?? `Task #${match.taskId}`} (#${match.taskId})`,
    );
    return;
  }

  await stopTimer(match.id);
  console.log(`Timer paused for: ${match.taskName ?? `Task #${match.taskId}`} (#${match.taskId})`);
}

export async function teamworkTimerSubmit(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await getMyTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  await completeTimer(match.id);
  console.log(
    `Timer submitted for: ${match.taskName ?? `Task #${match.taskId}`} (#${match.taskId})`,
  );
}

export async function teamworkTimerDelete(args: { task: string }): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const timers = await getMyTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  await deleteTimer(match.id);
  console.log(`Timer deleted for: ${match.taskName ?? `Task #${match.taskId}`} (#${match.taskId})`);
}

export async function teamworkTimesheetOpen(): Promise<void> {
  await openUrlInBrowser(TEAMWORK_TIMESHEET_URL);
  console.log(`Opened Teamwork timesheet: ${TEAMWORK_TIMESHEET_URL}`);
}
