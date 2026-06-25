import { createSignal } from "solid-js";

import {
  loadLocalTimers,
  startLocalTimer,
  stopLocalTimer,
  type LocalTimerEntry,
} from "../../api/teamwork/timers/local.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";

/**
 * Manages local timer state and provides shared timer toggle/open/refresh
 * operations used by multiple task-focused tabs.
 */
export function useTaskTimer(setMessage: (msg: string) => void) {
  const [localTimers, setLocalTimers] = createSignal<LocalTimerEntry[]>([]);
  const dialog = useDialog();

  const refreshLocalTimers = async () => {
    setLocalTimers(await loadLocalTimers());
  };

  const toggleTimer = async (task: { id: number; name: string } | null) => {
    if (!task) {
      setMessage("No task selected.");
      return;
    }

    try {
      const timers = localTimers();
      const runningTimer = timers.find((t) => t.status === "running");

      if (runningTimer?.taskId === task.id) {
        const stopped = await stopLocalTimer();
        if (stopped) {
          await refreshLocalTimers();
          setMessage(`Timer stopped for task: ${task.name}`);
        }
      } else if (runningTimer) {
        dialog.replace(() => (
          <ConfirmDialog
            title="Switch timer?"
            message={`Timer is already running for: ${runningTimer.taskName}`}
            confirmLabel="switch"
            onConfirm={async () => {
              await startLocalTimer(task.id, task.name);
              await refreshLocalTimers();
              setMessage(`Timer started for task: ${task.name} (previous paused)`);
            }}
          />
        ));
      } else {
        await startLocalTimer(task.id, task.name);
        await refreshLocalTimers();
        setMessage(`Timer started for task: ${task.name}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to toggle timer.");
    }
  };

  const openSelectedTask = async (
    task: { id: number; name: string; url?: string | null } | null,
  ) => {
    if (!task) {
      setMessage("No task selected.");
      return;
    }

    const url = task.url ?? getTeamworkTaskReference(task.id.toString()).url;

    try {
      await openUrlInBrowser(url);
      setMessage(`Opened Teamwork task: ${task.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to open Teamwork task.");
    }
  };

  return { localTimers, refreshLocalTimers, toggleTimer, openSelectedTask };
}
