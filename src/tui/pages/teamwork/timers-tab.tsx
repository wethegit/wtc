import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  formatTimerDuration,
  getLocalTimerElapsedMs,
  loadLocalTimers,
  removeLocalTimer,
  stopLocalTimer,
  type LocalTimerEntry,
} from "../../../teamwork/timers/local.ts";
import { createTaskTimeEntry } from "../../../teamwork/timers.ts";
import { TEAMWORK_TIMESHEET_URL } from "../../../teamwork/consts.ts";
import { openUrlInBrowser } from "../../../utils/browser.ts";
import { ConfirmDialog } from "../../components/confirm-dialog.tsx";
import { TimerIndicator } from "../../components/teamwork/timer-indicator.tsx";
import { useDialog } from "../../components/dialog.tsx";
import { Section } from "../../components/layout/section.tsx";
import { tokens } from "../../tokens.ts";

/** Cycles through local timer IDs in display order, wrapping around. */
export function getNextLocalTimerSelection(
  timers: readonly LocalTimerEntry[],
  currentId: string | null,
  direction: 1 | -1,
): string | null {
  if (!timers.length) return null;

  const currentIndex = currentId ? timers.findIndex((timer) => timer.id === currentId) : -1;
  const fallbackIndex = direction === 1 ? 0 : timers.length - 1;
  const nextIndex =
    currentIndex === -1
      ? fallbackIndex
      : (currentIndex + direction + timers.length) % timers.length;

  return timers[nextIndex]?.id ?? null;
}

/** Teamwork timers tab showing local timers (running first, then stopped/pending). */
export function TimersTab() {
  const [localTimers, setLocalTimers] = createSignal<LocalTimerEntry[]>([]);
  const [selectedTimerId, setSelectedTimerId] = createSignal<string | null>(null);
  const [flashOn, setFlashOn] = createSignal(true);
  const [now, setNow] = createSignal(new Date());
  const [message, setMessage] = createSignal("Local timers stay on this machine until submitted.");
  const dialog = useDialog();

  const refreshTimers = async () => {
    setLocalTimers(await loadLocalTimers());
  };

  const sortedTimers = () => {
    const timers = localTimers();
    return [...timers].sort((a, b) => {
      if (a.status === "running" && b.status !== "running") return -1;
      if (a.status !== "running" && b.status === "running") return 1;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  };

  const selectedTimer = () =>
    sortedTimers().find((timer) => timer.id === selectedTimerId()) ?? null;

  const stopSelectedTimer = async () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No local timer selected.");
      return;
    }

    if (timer.status !== "running") {
      setMessage(`Timer is already stopped: ${timer.taskName}`);
      return;
    }

    await stopLocalTimer();
    await refreshTimers();
    setMessage(`Timer stopped: ${timer.taskName}`);
  };

  const discardSelectedTimer = () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No local timer selected.");
      return;
    }

    dialog.replace(() => (
      <ConfirmDialog
        title="Discard timer?"
        message={`Discard local timer for: ${timer.taskName}`}
        confirmLabel="discard"
        onConfirm={async () => {
          await removeLocalTimer(timer.id);
          await refreshTimers();
          setMessage(`Timer discarded: ${timer.taskName}`);
        }}
      />
    ));
  };

  const submitSelectedTimer = () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No local timer selected.");
      return;
    }

    const totalMinutes = Math.max(1, Math.ceil(getLocalTimerElapsedMs(timer, now()) / 60_000));
    const duration = formatTimerDuration(totalMinutes * 60_000);
    const action = timer.status === "running" ? "Stop and submit" : "Submit";

    dialog.replace(() => (
      <ConfirmDialog
        title={timer.status === "running" ? "Stop and submit timer?" : "Submit timer?"}
        message={`${action} ${duration} to Teamwork for: ${timer.taskName}`}
        confirmLabel="submit"
        onConfirm={async () => {
          try {
            const timerToSubmit = timer.status === "running" ? await stopLocalTimer() : timer;
            if (!timerToSubmit) {
              setMessage("No running timer found to submit.");
              return;
            }

            const finalMinutes = Math.max(
              1,
              Math.ceil(getLocalTimerElapsedMs(timerToSubmit, new Date()) / 60_000),
            );
            await createTaskTimeEntry({
              taskId: timerToSubmit.taskId,
              date: timerToSubmit.startTime.slice(0, 10),
              hours: Math.floor(finalMinutes / 60),
              minutes: finalMinutes % 60,
              description: timerToSubmit.taskName,
            });
            await removeLocalTimer(timerToSubmit.id);
            await refreshTimers();
            setMessage(`Timer submitted: ${timerToSubmit.taskName}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to submit timer.");
          }
        }}
      />
    ));
  };

  const openTimesheet = async () => {
    try {
      await openUrlInBrowser(TEAMWORK_TIMESHEET_URL);
      setMessage(`Opened Teamwork timesheet: ${TEAMWORK_TIMESHEET_URL}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to open Teamwork timesheet.");
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "down",
        desc: "Next local timer",
        group: "Teamwork Timers",
        cmd: () => {
          setSelectedTimerId((current) => getNextLocalTimerSelection(sortedTimers(), current, 1));
        },
      },
      {
        key: "up",
        desc: "Previous local timer",
        group: "Teamwork Timers",
        cmd: () => {
          setSelectedTimerId((current) => getNextLocalTimerSelection(sortedTimers(), current, -1));
        },
      },
      {
        key: "ctrl+t",
        desc: "Stop selected local timer",
        group: "Teamwork Timers",
        cmd: () => {
          void stopSelectedTimer();
        },
      },
      {
        key: "ctrl+d",
        desc: "Discard selected local timer",
        group: "Teamwork Timers",
        cmd: discardSelectedTimer,
      },
      {
        key: "ctrl+s",
        desc: "Submit selected local timer",
        group: "Teamwork Timers",
        cmd: submitSelectedTimer,
      },
      {
        key: "ctrl+o",
        desc: "Open Teamwork timesheet",
        group: "Teamwork Timers",
        cmd: () => {
          void openTimesheet();
        },
      },
    ],
  }));

  createEffect(() => {
    const timers = sortedTimers();
    const selected = selectedTimerId();
    if (!timers.length) {
      setSelectedTimerId(null);
    } else if (!selected || !timers.some((timer) => timer.id === selected)) {
      setSelectedTimerId(timers[0]?.id ?? null);
    }
  });

  onMount(() => {
    void refreshTimers();

    const flashInterval = setInterval(() => {
      setFlashOn((prev) => !prev);
    }, 800);
    const durationInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    onCleanup(() => {
      clearInterval(flashInterval);
      clearInterval(durationInterval);
    });
  });

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={tokens.borderFocus}
      paddingY={1}
      paddingX={2}
      gap={1}
    >
      <text fg={tokens.text}>{localTimers().length > 0 ? "Local Timers" : "No timers"}</text>
      <text fg={tokens.textDim}>{message()}</text>

      <For each={sortedTimers()}>
        {(timer) => (
          <Section
            active={selectedTimerId() === timer.id}
            title={timer.taskName}
            description={[
              `Task ID: ${timer.taskId}`,
              `Started: ${new Date(timer.startTime).toLocaleString()}`,
              timer.endTime ? `Ended: ${new Date(timer.endTime).toLocaleString()}` : "",
              `Duration: ${formatTimerDuration(getLocalTimerElapsedMs(timer, now()))}`,
              `Status: ${timer.status}`,
            ]}
          >
            <TimerIndicator status={timer.status} flashOn={flashOn()} />
          </Section>
        )}
      </For>
    </box>
  );
}
