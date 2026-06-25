import { createEffect, createSignal, For, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig } from "../../../api/config/manager.ts";
import type { ResolvedConfig } from "../../../api/config/schema.ts";
import { getTeamworkAuthStatus, type TeamworkAuthStatus } from "../../../api/teamwork/auth.ts";
import {
  getTeamworkProjectMetadata,
  type TeamworkProjectMetadataResult,
} from "../../../api/teamwork/project-metadata.ts";
import { getPinnedTaskListTasks } from "../../../api/teamwork/task-list-tasks.ts";
import type { TeamworkTask } from "../../../api/teamwork/task-list-tasks.ts";
import { Card } from "../../components/layout/card.tsx";
import { TaskList } from "../../components/teamwork/task-list.tsx";
import { usePageScroll } from "../../components/layout/scroll-context.tsx";
import { useFlashInterval } from "../../hooks/use-flash-interval.ts";
import { useTaskTimer } from "../../hooks/use-task-timer.tsx";
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
  const [projectMessage, setProjectMessage] = createSignal("Loading project context...");
  const scroll = usePageScroll();
  const flashOn = useFlashInterval();
  const { localTimers, refreshLocalTimers, toggleTimer, openSelectedTask } =
    useTaskTimer(setProjectMessage);

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

      const results = await getPinnedTaskListTasks(config.project.teamwork.pinnedTaskLists);
      const nextPinnedTaskLists: PinnedTaskListState[] = results.map((r) => ({
        id: r.id,
        name: r.name,
        tasks: r.tasks,
        message: r.error,
      }));

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
        cmd: () => openSelectedTask(selectedTeamworkTask()),
      },
      {
        key: "ctrl+o",
        desc: "Open pinned Teamwork task",
        group: "Teamwork",
        cmd: () => openSelectedTask(selectedTeamworkTask()),
      },
      {
        key: "ctrl+t",
        desc: "Start/pause local timer",
        group: "Teamwork",
        cmd: () => toggleTimer(selectedTeamworkTask()),
      },
    ],
  }));

  onMount(() => {
    void loadProjectContext();
    void refreshLocalTimers();
  });

  return (
    <box flexDirection="column" gap={1}>
      <Card title={projectMetadata()?.project.name}>
        {projectMetadata() ? (
          <text fg={tokens.textDim}>{projectMessage()}</text>
        ) : (
          <text fg={tokens.textDim}>{projectMessage()}</text>
        )}

        {(resolved()?.project?.project.links.length ?? 0) > 0 && (
          <box flexDirection="column" gap={0}>
            <text fg={tokens.text}>Project links</text>
            <For each={resolved()?.project?.project.links ?? []}>
              {(link) => (
                <text fg={tokens.textDim}>
                  {link.name}: {link.url}
                </text>
              )}
            </For>
          </box>
        )}
      </Card>

      {(resolved()?.project?.teamwork.pinnedTaskLists.length ?? 0) > 0 && (
        <Card title="Pinned task lists">
          <For each={pinnedTaskLists()}>
            {(taskList) => (
              <Card title={taskList.name}>
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
                    localTimers={localTimers()}
                    flashOn={flashOn()}
                  />
                )}
              </Card>
            )}
          </For>
        </Card>
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
