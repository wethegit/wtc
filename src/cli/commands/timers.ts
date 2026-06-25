import { TEAMWORK_TIMESHEET_URL } from "../../api/teamwork/consts.ts";
import { getTeamworkTaskReference, type TeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import { getLocalTimerElapsedMs, formatTimerDuration } from "../../api/teamwork/timers/local.ts";
import type { LocalTimerEntry } from "../../api/teamwork/timers/local.ts";
import { createTaskTimeEntry, type TeamworkTaskTimeEntryInput } from "../../api/teamwork/timers.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";

interface TimerListActions {
  loadLocalTimers: () => Promise<LocalTimerEntry[]>;
}

interface TimerHandleActions {
  getTeamworkTaskReference: (value: string) => TeamworkTaskReference;
  loadLocalTimers: () => Promise<LocalTimerEntry[]>;
}

interface TimerStartActions {
  getTeamworkTaskReference: (value: string) => TeamworkTaskReference;
  getTeamworkTaskById: (id: number) => Promise<{ id: number; name: string }>;
  startLocalTimer: (taskId: number, taskName: string) => Promise<LocalTimerEntry>;
}

interface TimerStopActions extends TimerHandleActions {
  stopLocalTimer: () => Promise<LocalTimerEntry | null>;
}

interface TimerSubmitActions extends TimerHandleActions {
  stopLocalTimer: () => Promise<LocalTimerEntry | null>;
  createTaskTimeEntry: (input: TeamworkTaskTimeEntryInput) => Promise<number>;
  removeLocalTimer: (id: string) => Promise<void>;
}

interface TimerDiscardActions extends TimerHandleActions {
  removeLocalTimer: (id: string) => Promise<void>;
}

interface TimesheetOpenActions {
  openUrlInBrowser: (url: string) => Promise<void>;
}

const timerListActions: TimerListActions = {
  loadLocalTimers: async () => {
    const { loadLocalTimers } = await import("../../api/teamwork/timers/local.ts");
    return loadLocalTimers();
  },
};

const timerHandleActions: TimerHandleActions = {
  getTeamworkTaskReference,
  loadLocalTimers: async () => {
    const { loadLocalTimers } = await import("../../api/teamwork/timers/local.ts");
    return loadLocalTimers();
  },
};

const timerStartActions: TimerStartActions = {
  getTeamworkTaskReference,
  getTeamworkTaskById,
  startLocalTimer: async (taskId, taskName) => {
    const { startLocalTimer } = await import("../../api/teamwork/timers/local.ts");
    return (await startLocalTimer(taskId, taskName)).timer;
  },
};

const timerStopActions: TimerStopActions = {
  ...timerHandleActions,
  stopLocalTimer: async () => {
    const { stopLocalTimer } = await import("../../api/teamwork/timers/local.ts");
    return stopLocalTimer();
  },
};

const timerSubmitActions: TimerSubmitActions = {
  ...timerHandleActions,
  stopLocalTimer: async () => {
    const { stopLocalTimer } = await import("../../api/teamwork/timers/local.ts");
    return stopLocalTimer();
  },
  createTaskTimeEntry,
  removeLocalTimer: async (id) => {
    const { removeLocalTimer } = await import("../../api/teamwork/timers/local.ts");
    return removeLocalTimer(id);
  },
};

const timerDiscardActions: TimerDiscardActions = {
  ...timerHandleActions,
  removeLocalTimer: async (id) => {
    const { removeLocalTimer } = await import("../../api/teamwork/timers/local.ts");
    return removeLocalTimer(id);
  },
};

const timesheetOpenActions: TimesheetOpenActions = {
  openUrlInBrowser,
};

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

export async function teamworkTimerList(
  args: { json: boolean },
  actions = timerListActions,
): Promise<void> {
  const timers = await actions.loadLocalTimers();
  console.log(formatTimerListOutput(timers, { json: args.json }));
}

export async function teamworkTimerStart(
  args: { task: string },
  actions = timerStartActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const task = await actions.getTeamworkTaskById(ref.id);
  await actions.startLocalTimer(task.id, task.name);
  console.log(`Timer started for: ${task.name} (#${task.id})`);
}

export async function teamworkTimerStop(
  args: { task: string },
  actions = timerStopActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const timers = await actions.loadLocalTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No local timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  if (match.status !== "running") {
    console.log(`Timer already stopped for: ${match.taskName} (#${match.taskId})`);
    return;
  }

  await actions.stopLocalTimer();
  console.log(`Timer stopped for: ${match.taskName} (#${match.taskId})`);
}

export async function teamworkTimerSubmit(
  args: { task: string },
  actions = timerSubmitActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const timers = await actions.loadLocalTimers();
  const match = findTimerByTaskId(timers, ref.id);

  if (!match) {
    console.log(`No local timer found for task: #${ref.id}${formatExistingTimersHint(timers)}`);
    return;
  }

  const timerToSubmit = match.status === "running" ? await actions.stopLocalTimer() : match;
  if (!timerToSubmit) {
    console.log("No timer found to submit.");
    return;
  }

  const elapsedMs = getLocalTimerElapsedMs(timerToSubmit, new Date());
  const totalMinutes = Math.max(1, Math.ceil(elapsedMs / 60_000));

  await actions.createTaskTimeEntry({
    taskId: timerToSubmit.taskId,
    date: timerToSubmit.startTime.slice(0, 10),
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    description: timerToSubmit.taskName,
  });

  await actions.removeLocalTimer(timerToSubmit.id);
  console.log(`Timer submitted for: ${timerToSubmit.taskName} (#${timerToSubmit.taskId})`);
}

export async function teamworkTimerDiscard(
  args: { task: string },
  actions = timerDiscardActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const timers = await actions.loadLocalTimers();
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

  await actions.removeLocalTimer(match.id);
  console.log(`Timer discarded for: ${match.taskName} (#${match.taskId})`);
}

export async function teamworkTimesheetOpen(
  _args: Record<string, never> = {},
  actions = timesheetOpenActions,
): Promise<void> {
  await actions.openUrlInBrowser(TEAMWORK_TIMESHEET_URL);
  console.log(`Opened Teamwork timesheet: ${TEAMWORK_TIMESHEET_URL}`);
}
