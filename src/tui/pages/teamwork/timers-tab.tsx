import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  completeTimer,
  deleteTimer,
  getMyTimers,
  getTimerElapsedMs,
  formatTimerDuration,
  resumeTimer,
  stopTimer,
  type TeamworkTimer,
} from "../../../api/teamwork/timers/api.ts";
import { TEAMWORK_TIMESHEET_URL } from "../../../api/teamwork/consts.ts";
import { openUrlInBrowser } from "../../../utils/browser.ts";
import { Card } from "../../components/layout/card.tsx";
import { ListItem } from "../../components/layout/list-item.tsx";
import { ConfirmDialog } from "../../components/confirm-dialog.tsx";
import { TimerBadge } from "../../components/teamwork/timer-indicator.tsx";
import { useDialog } from "../../components/dialog.tsx";
import { useFlashInterval } from "../../hooks/use-flash-interval.ts";
import { tokens } from "../../tokens.ts";

/** Cycles through timer IDs in display order, wrapping around. */
function getNextTimerSelection(
  timers: readonly TeamworkTimer[],
  currentId: number | null,
  direction: 1 | -1,
): number | null {
  if (!timers.length) return null;

  const currentIndex =
    currentId !== null ? timers.findIndex((timer) => timer.id === currentId) : -1;
  const fallbackIndex = direction === 1 ? 0 : timers.length - 1;
  const nextIndex =
    currentIndex === -1
      ? fallbackIndex
      : (currentIndex + direction + timers.length) % timers.length;

  return timers[nextIndex]?.id ?? null;
}

/** Teamwork timers tab showing native timers (running first, then stopped). */
export function TimersTab() {
  const [twTimers, setTwTimers] = createSignal<TeamworkTimer[]>([]);
  const [selectedTimerId, setSelectedTimerId] = createSignal<number | null>(null);
  const flashOn = useFlashInterval();
  const [now, setNow] = createSignal(new Date());
  const [message, setMessage] = createSignal("Timers are tracked server-side in Teamwork.");
  const dialog = useDialog();

  const refreshTimers = async () => {
    try {
      setTwTimers(await getMyTimers());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to refresh timers from Teamwork.",
      );
    }
  };

  const sortedTimers = () => {
    const timers = twTimers();
    return [...timers].sort((a, b) => {
      if (a.running && !b.running) return -1;
      if (!a.running && b.running) return 1;
      return new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime();
    });
  };

  const selectedTimer = () =>
    sortedTimers().find((timer) => timer.id === selectedTimerId()) ?? null;

  const toggleSelectedTimer = async () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No timer selected.");
      return;
    }

    const timerLabel =
      timer.taskName ?? (timer.taskId ? `Task #${timer.taskId}` : `Timer #${timer.id}`);
    try {
      if (timer.running) {
        await stopTimer(timer.id);
        await refreshTimers();
        setMessage(`Timer paused: ${timerLabel}`);
        return;
      }

      await resumeTimer(timer.id);
      await refreshTimers();
      setMessage(`Timer started: ${timerLabel}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to toggle timer.");
    }
  };

  const submitSelectedTimer = () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No timer selected.");
      return;
    }

    const timerLabel =
      timer.taskName ?? (timer.taskId ? `Task #${timer.taskId}` : `Timer #${timer.id}`);
    dialog.replace(() => (
      <ConfirmDialog
        title="Submit timer?"
        message={`Submit tracked time to Teamwork for: ${timerLabel}`}
        confirmLabel="submit"
        onConfirm={async () => {
          try {
            await completeTimer(timer.id);
            await refreshTimers();
            setMessage(`Timer submitted: ${timerLabel}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to submit timer.");
          }
        }}
      />
    ));
  };

  const deleteSelectedTimer = () => {
    const timer = selectedTimer();
    if (!timer) {
      setMessage("No timer selected.");
      return;
    }

    const timerLabel =
      timer.taskName ?? (timer.taskId ? `Task #${timer.taskId}` : `Timer #${timer.id}`);
    dialog.replace(() => (
      <ConfirmDialog
        title="Delete timer?"
        message={`Delete timer for: ${timerLabel}`}
        confirmLabel="delete"
        onConfirm={async () => {
          try {
            await deleteTimer(timer.id);
            await refreshTimers();
            setMessage(`Timer deleted: ${timerLabel}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to delete timer.");
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
    enabled: !dialog.active(),
    bindings: [
      {
        key: "down",
        desc: "Next timer",
        group: "Teamwork Timers",
        cmd: () => {
          setSelectedTimerId((current) => getNextTimerSelection(sortedTimers(), current, 1));
        },
      },
      {
        key: "up",
        desc: "Previous timer",
        group: "Teamwork Timers",
        cmd: () => {
          setSelectedTimerId((current) => getNextTimerSelection(sortedTimers(), current, -1));
        },
      },
      {
        key: "ctrl+t",
        desc: "Toggle selected timer",
        group: "Teamwork Timers",
        cmd: () => {
          void toggleSelectedTimer();
        },
      },
      {
        key: "ctrl+s",
        desc: "Submit selected timer",
        group: "Teamwork Timers",
        cmd: submitSelectedTimer,
      },
      {
        key: "ctrl+d",
        desc: "Delete selected timer",
        group: "Teamwork Timers",
        cmd: deleteSelectedTimer,
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
    } else if (selected === null || !timers.some((timer) => timer.id === selected)) {
      setSelectedTimerId(timers[0]?.id ?? null);
    }
  });

  onMount(() => {
    void refreshTimers();

    const durationInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    onCleanup(() => {
      clearInterval(durationInterval);
    });
  });

  const timerMetadata = (timer: TeamworkTimer): string[] => {
    const parts: string[] = [];
    const elapsedMs = getTimerElapsedMs(timer, now());
    parts.push(formatTimerDuration(elapsedMs));
    return parts;
  };

  return (
    <box flexDirection="column" gap={1}>
      <Card title={twTimers().length > 0 ? "Timers" : "No timers"}>
        <text fg={tokens.textDim}>{message()}</text>

        <For each={sortedTimers()}>
          {(timer) => (
            <ListItem
              title={
                timer.taskName ?? (timer.taskId ? `Task #${timer.taskId}` : `Timer #${timer.id}`)
              }
              metadata={timerMetadata(timer)}
              selected={selectedTimerId() === timer.id}
              badge={
                <TimerBadge
                  elapsedMs={getTimerElapsedMs(timer, now())}
                  running={timer.running}
                  flashOn={flashOn()}
                />
              }
            />
          )}
        </For>
      </Card>
    </box>
  );
}
