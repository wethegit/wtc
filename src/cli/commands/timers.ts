import { TEAMWORK_TIMESHEET_URL } from "../../api/teamwork/consts.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import {
  getMyTimers,
  startTimer,
  stopTimer,
  deleteTimer,
  getTimerElapsedMs,
  formatTimerDuration,
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

function formatExistingTimersHint(timers: readonly TeamworkTimer[]): string {
  if (timers.length === 0) return "";
  const now = new Date();
  const lines = timers.map((t) => `  ${formatTimerEntry(t, now)}`);
  return `\nExisting timers:\n${lines.join("\n")}`;
}

function formatTimerEntry(timer: TeamworkTimer, now: Date): string {
  const elapsed = getTimerElapsedMs(timer, now);
  const duration = formatTimerDuration(elapsed);
  const statusSymbol = timer.running ? " ⏱" : "";
  const name = timer.taskName ?? `Task #${timer.taskId}`;
  return `${name} (#${timer.taskId}) — ${duration} — ${timer.running ? "running" : "stopped"}${statusSymbol}`;
}

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
  await startTimer(task.id, task.name);
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
  console.log(`Timer stopped for: ${match.taskName ?? `Task #${match.taskId}`} (#${match.taskId})`);
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
