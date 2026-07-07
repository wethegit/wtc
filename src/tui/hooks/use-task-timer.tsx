import { createSignal } from "solid-js";

import {
  getMyTimers,
  resumeTimer,
  startTimer,
  stopTimer,
  type TeamworkTimer,
} from "../../api/teamwork/timers/api.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";

/**
 * Manages Teamwork native timer state and provides shared timer toggle/open/refresh
 * operations used by multiple task-focused tabs.
 */
export function useTaskTimer(setMessage: (msg: string) => void) {
  const [timers, setTimers] = createSignal<TeamworkTimer[]>([]);
  const dialog = useDialog();

  const refreshTimers = async () => {
    try {
      setTimers(await getMyTimers());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load timers.");
    }
  };

  const toggleTimer = async (task: { id: number; projectId: number; name: string } | null) => {
    if (!task) {
      setMessage("No task selected.");
      return;
    }

    try {
      const currentTimers = timers();
      const runningTimer = currentTimers.find((t) => t.running);
      const taskTimer = currentTimers
        .filter((t) => t.taskId === task.id)
        .sort(
          (a, b) => new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime(),
        )[0];

      if (runningTimer?.taskId === task.id) {
        await stopTimer(runningTimer.id);
        await refreshTimers();
        setMessage(`Timer paused for task: ${task.name}`);
      } else if (runningTimer) {
        dialog.replace(() => (
          <ConfirmDialog
            title="Switch timer?"
            message={`Timer is already running for: ${runningTimer.taskName ?? (runningTimer.taskId ? `Task #${runningTimer.taskId}` : `Timer #${runningTimer.id}`)}`}
            onConfirm={async () => {
              if (taskTimer) {
                await resumeTimer(taskTimer.id);
              } else {
                await startTimer({
                  projectId: task.projectId,
                  taskId: task.id,
                  description: task.name,
                });
              }
              await refreshTimers();
              setMessage(`Timer started for task: ${task.name} (previous paused)`);
            }}
          />
        ));
      } else if (taskTimer) {
        await resumeTimer(taskTimer.id);
        await refreshTimers();
        setMessage(`Timer started for task: ${task.name}`);
      } else {
        await startTimer({ projectId: task.projectId, taskId: task.id, description: task.name });
        await refreshTimers();
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

  return { timers, refreshTimers, toggleTimer, openSelectedTask };
}
