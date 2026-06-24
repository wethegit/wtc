import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig } from "../../../config/manager.ts";
import type { ResolvedConfig } from "../../../config/schema.ts";
import { getTeamworkAuthStatus, type TeamworkAuthStatus } from "../../../teamwork/auth.ts";
import {
  getTeamworkProjectMetadata,
  type TeamworkProjectMetadataResult,
} from "../../../teamwork/project-metadata.ts";
import { getTeamworkTaskListTasks, type TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import {
  loadLocalTimers,
  startLocalTimer,
  stopLocalTimer,
  type LocalTimerEntry,
} from "../../../teamwork/timers/local.ts";
import { getTeamworkTaskReference } from "../../../teamwork/tasks.ts";
import { openUrlInBrowser } from "../../../utils/browser.ts";
import { ConfirmDialog } from "../../components/confirm-dialog.tsx";
import { TaskList } from "../../components/teamwork/task-list.tsx";
import { useDialog } from "../../components/dialog.tsx";
import { usePageScroll } from "../../components/layout/scroll-context.tsx";
import { tokens } from "../../tokens.ts";

interface PinnedTaskListState {
  id: number;
  name: string;
  tasks: TeamworkTask[];
  message: string | null;
}

/** Selection state tracking which pinned task list and task is currently selected. */
export interface PinnedTaskSelection {
  taskListId: number;
  taskId: number;
}

/** Teamwork project tab showing project metadata, links, and pinned task lists with keyboard navigation. */
export function ProjectTab() {
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [_teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [projectMetadata, setProjectMetadata] = createSignal<TeamworkProjectMetadataResult | null>(
    null,
  );
  const [pinnedTaskLists, setPinnedTaskLists] = createSignal<PinnedTaskListState[]>([]);
  const [selectedTask, setSelectedTask] = createSignal<PinnedTaskSelection | null>(null);
  const [localTimers, setLocalTimers] = createSignal<LocalTimerEntry[]>([]);
  const [flashOn, setFlashOn] = createSignal(true);
  const [projectMessage, setProjectMessage] = createSignal("Loading project context...");
  const dialog = useDialog();
  const scroll = usePageScroll();

  createEffect(() => {
    const sel = selectedTask();
    if (sel && scroll) {
      scroll.scrollChildIntoView(`task-${sel.taskListId}-${sel.taskId}`);
    }
  });

  const selectedTeamworkTask = () => {
    const selected = selectedTask();
    if (!selected) return null;

    return (
      pinnedTaskLists()
        .find((taskList) => taskList.id === selected.taskListId)
        ?.tasks.find((task) => task.id === selected.taskId) ?? null
    );
  };

  const loadProjectContext = async () => {
    setProjectMessage("Loading project context...");
    setProjectMetadata(null);
    setPinnedTaskLists([]);
    setSelectedTask(null);

    try {
      const config = await loadResolvedConfig(process.cwd());
      const authStatus = await getTeamworkAuthStatus();
      const projectId = config.project?.teamwork.projectId ?? null;

      setResolved(config);
      setTeamworkAuthStatus(authStatus);

      if (!config.project) {
        setProjectMessage("No project config found. Use Settings to create .wtc.yaml.");
        return;
      }

      if (!projectId) {
        setProjectMessage("Set teamwork.projectId in Settings to load Teamwork metadata.");
        return;
      }

      if (authStatus === "missing") {
        setProjectMessage(
          "Teamwork auth not configured. Use Settings or `wtc config auth set` to add your API token.",
        );
        return;
      }

      const metadata = await getTeamworkProjectMetadata(projectId);
      setProjectMetadata(metadata);

      const nextPinnedTaskLists: PinnedTaskListState[] = [];
      for (const taskList of config.project.teamwork.pinnedTaskLists) {
        try {
          nextPinnedTaskLists.push({
            id: taskList.id,
            name: taskList.name,
            tasks: await getTeamworkTaskListTasks(taskList.id),
            message: null,
          });
        } catch (error) {
          nextPinnedTaskLists.push({
            id: taskList.id,
            name: taskList.name,
            tasks: [],
            message: error instanceof Error ? error.message : "Failed to load task list.",
          });
        }
      }

      setPinnedTaskLists(nextPinnedTaskLists);
      setSelectedTask(getNextPinnedTaskSelection(nextPinnedTaskLists, selectedTask(), 1));
      setProjectMessage(
        metadata.source === "cache"
          ? "Using cached Teamwork project metadata."
          : "Fetched Teamwork project metadata.",
      );
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Failed to load project context.");
    }
  };

  const openSelectedTask = async () => {
    const task = selectedTeamworkTask();
    if (!task) {
      setProjectMessage("No pinned task selected.");
      return;
    }

    const url = task.url ?? getTeamworkTaskReference(task.id.toString()).url;

    try {
      await openUrlInBrowser(url);
      setProjectMessage(`Opened Teamwork task: ${task.name}`);
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Failed to open Teamwork task.");
    }
  };

  const refreshLocalTimers = async () => {
    setLocalTimers(await loadLocalTimers());
  };

  const toggleTimer = async () => {
    const task = selectedTeamworkTask();
    if (!task) {
      setProjectMessage("No pinned task selected.");
      return;
    }

    try {
      const timers = localTimers();
      const runningTimer = timers.find((t) => t.status === "running");

      if (runningTimer?.taskId === task.id) {
        const stopped = await stopLocalTimer();
        if (stopped) {
          setProjectMessage(`Timer stopped for task: ${task.name}`);
          await refreshLocalTimers();
        }
      } else {
        if (runningTimer) {
          dialog.replace(() => (
            <ConfirmDialog
              title="Switch timer?"
              message={`Timer is already running for: ${runningTimer.taskName}`}
              confirmLabel="switch"
              onConfirm={async () => {
                await startLocalTimer(task.id, task.name);
                await refreshLocalTimers();
                setProjectMessage(`Timer started for task: ${task.name} (previous paused)`);
              }}
            />
          ));
          return;
        }

        await startLocalTimer(task.id, task.name);
        await refreshLocalTimers();
        setProjectMessage(`Timer started for task: ${task.name}`);
      }
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Failed to toggle timer.");
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "down",
        desc: "Next pinned Teamwork task",
        group: "Teamwork",
        cmd: () => {
          setSelectedTask((current) => getNextPinnedTaskSelection(pinnedTaskLists(), current, 1));
        },
      },
      {
        key: "up",
        desc: "Previous pinned Teamwork task",
        group: "Teamwork",
        cmd: () => {
          setSelectedTask((current) => getNextPinnedTaskSelection(pinnedTaskLists(), current, -1));
        },
      },
      {
        key: "return",
        desc: "Open pinned Teamwork task",
        group: "Teamwork",
        cmd: openSelectedTask,
      },
      {
        key: "ctrl+o",
        desc: "Open pinned Teamwork task",
        group: "Teamwork",
        cmd: openSelectedTask,
      },
      {
        key: "ctrl+t",
        desc: "Start/pause local timer",
        group: "Teamwork",
        cmd: toggleTimer,
      },
    ],
  }));

  onMount(() => {
    void loadProjectContext();
    void refreshLocalTimers();

    const flashInterval = setInterval(() => {
      setFlashOn((prev) => !prev);
    }, 800);

    onCleanup(() => clearInterval(flashInterval));
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
      <box>
        {projectMetadata() ? (
          <box flexDirection="row" justifyContent="space-between" gap={0}>
            <text fg={tokens.text}>{projectMetadata()?.project.name}</text>
            <text fg={tokens.textDim}>{projectMessage()}</text>
          </box>
        ) : (
          <text fg={tokens.textDim}>{projectMessage()}</text>
        )}
      </box>

      {resolved()?.project?.project.links.length > 0 && (
        <box>
          <text attributes={TextAttributes.BOLD} fg={tokens.text}>
            Project links
          </text>
          <For each={resolved()?.project?.project.links ?? []}>
            {(link) => (
              <text fg={tokens.textDim}>
                {link.name}: {link.url}
              </text>
            )}
          </For>
        </box>
      )}

      {resolved()?.project?.teamwork.pinnedTaskLists.length > 0 && (
        <box
          border={["top", "left"]}
          borderColor={tokens.border}
          title="Pinned task lists"
          titleColor={tokens.text}
          paddingY={1}
          gap={1}
        >
          <For each={pinnedTaskLists()}>
            {(taskList) => (
              <box
                border={["top", "left"]}
                borderColor={tokens.border}
                title={taskList.name}
                titleColor={tokens.text}
                paddingY={1}
              >
                {taskList.message ? (
                  <text fg={tokens.textDim}>{taskList.message}</text>
                ) : (
                  <TaskList
                    taskListId={taskList.id}
                    tasks={taskList.tasks}
                    emptyMessage="No tasks found."
                    selectedTaskId={
                      selectedTask()?.taskListId === taskList.id ? selectedTask()?.taskId : null
                    }
                    timerTaskIds={localTimers().map((t) => t.taskId)}
                    runningTaskId={
                      localTimers().find((t) => t.status === "running")?.taskId ?? null
                    }
                    flashOn={flashOn()}
                  />
                )}
              </box>
            )}
          </For>
        </box>
      )}
    </box>
  );
}

interface PinnedTaskSelectionSource {
  id: number;
  tasks: readonly { id: number }[];
}

/** Flattens all tasks across pinned task lists into a flat ordered selection array for keyboard navigation. */
export function getPinnedTaskSelectionOrder(
  taskLists: readonly PinnedTaskSelectionSource[],
): PinnedTaskSelection[] {
  return taskLists.flatMap((taskList) =>
    taskList.tasks.map((task) => ({ taskListId: taskList.id, taskId: task.id })),
  );
}

/** Cycles to the next or previous pinned task across all task lists, wrapping around. */
export function getNextPinnedTaskSelection(
  taskLists: readonly PinnedTaskSelectionSource[],
  current: PinnedTaskSelection | null,
  direction: 1 | -1,
): PinnedTaskSelection | null {
  const order = getPinnedTaskSelectionOrder(taskLists);
  if (!order.length) return null;

  const currentIndex = current
    ? order.findIndex(
        (selection) =>
          selection.taskListId === current.taskListId && selection.taskId === current.taskId,
      )
    : -1;
  const fallbackIndex = direction === 1 ? 0 : order.length - 1;
  const nextIndex =
    currentIndex === -1 ? fallbackIndex : (currentIndex + direction + order.length) % order.length;

  return order[nextIndex] ?? null;
}
