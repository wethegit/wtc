import { createEffect, createSignal, For, onMount } from "solid-js";
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
import { getTeamworkTaskReference } from "../../../teamwork/tasks.ts";
import { openUrlInBrowser } from "../../../utils/browser.ts";
import { TaskList } from "../../components/teamwork/task-list.tsx";
import { Section } from "../../components/layout/section.tsx";
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
  const [teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [projectMetadata, setProjectMetadata] = createSignal<TeamworkProjectMetadataResult | null>(
    null,
  );
  const [pinnedTaskLists, setPinnedTaskLists] = createSignal<PinnedTaskListState[]>([]);
  const [selectedTask, setSelectedTask] = createSignal<PinnedTaskSelection | null>(null);
  const [projectMessage, setProjectMessage] = createSignal("Loading project context...");
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
    ],
  }));

  onMount(() => {
    void loadProjectContext();
  });

  return (
    <Section
      title="Project Teamwork"
      description="Project-specific Teamwork context from the nearest .wtc.yaml."
    >
      <box flexDirection="column" gap={1}>
        <box flexDirection="column" gap={0}>
          <text fg={tokens.textDim}>
            Project config: {resolved()?.paths.projectConfigPath ?? "not found"}
          </text>
          <text fg={tokens.textDim}>
            Teamwork project ID: {resolved()?.project?.teamwork.projectId ?? "not configured"}
          </text>
          <text fg={tokens.textDim}>Teamwork auth: {teamworkAuthStatus()}</text>
        </box>

        {projectMetadata() ? (
          <box flexDirection="column" gap={0}>
            <text fg={tokens.text}>Teamwork project: {projectMetadata()?.project.name}</text>
            <text fg={tokens.textDim}>{projectMessage()}</text>
          </box>
        ) : (
          <text fg={tokens.textDim}>{projectMessage()}</text>
        )}

        <box flexDirection="column" gap={0}>
          <text attributes={TextAttributes.BOLD} fg={tokens.text}>
            Project links
          </text>
          {resolved()?.project?.project.links.length ? (
            <For each={resolved()?.project?.project.links ?? []}>
              {(link) => (
                <text fg={tokens.textDim}>
                  {link.name}: {link.url}
                </text>
              )}
            </For>
          ) : (
            <text fg={tokens.textDim}>No project links configured.</text>
          )}
        </box>

        <box flexDirection="column" gap={1}>
          <text attributes={TextAttributes.BOLD} fg={tokens.text}>
            Pinned task lists
          </text>
          {resolved()?.project?.teamwork.pinnedTaskLists.length ? (
            <For each={pinnedTaskLists()}>
              {(taskList) => (
                <box flexDirection="column" gap={0}>
                  <text fg={tokens.text}>
                    {taskList.name} ({taskList.id})
                  </text>
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
                    />
                  )}
                </box>
              )}
            </For>
          ) : (
            <text fg={tokens.textDim}>No pinned task lists configured.</text>
          )}
        </box>
      </box>
    </Section>
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
