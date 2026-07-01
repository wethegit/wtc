import { createEffect, createSignal, For, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import { getTeamworkAuthStatus, type TeamworkAuthStatus } from "../../../api/teamwork/auth.ts";
import { getTeamworkCurrentUser, type TeamworkCurrentUser } from "../../../api/teamwork/user.ts";
import {
  getTeamworkMyTasksGrouped,
  type MyWorkTask,
  type ProjectTaskGroup,
} from "../../../api/teamwork/my-tasks.ts";
import { useDialog } from "../../components/dialog.tsx";
import { Card } from "../../components/layout/card.tsx";
import { TaskList } from "../../components/teamwork/task-list.tsx";
import { usePageScroll } from "../../components/layout/scroll-context.tsx";
import { useFlashInterval } from "../../hooks/use-flash-interval.ts";
import { useBranchWorkflow } from "../../hooks/use-branch-workflow.tsx";
import { usePrWorkflow } from "../../hooks/use-pr-workflow.tsx";
import { useTaskTimer } from "../../hooks/use-task-timer.tsx";
import { tokens } from "../../tokens.ts";

interface MyWorkSelection {
  projectId: number;
  taskId: number;
}

/** My Work tab showing tasks assigned to the current user, grouped by project. */
export function MyWorkTab() {
  const dialog = useDialog();
  const [_teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [currentUser, setCurrentUser] = createSignal<TeamworkCurrentUser | null>(null);
  const [projectGroups, setProjectGroups] = createSignal<ProjectTaskGroup[]>([]);
  const [selectedTask, setSelectedTask] = createSignal<MyWorkSelection | null>(null);
  const [message, setMessage] = createSignal("Loading my tasks...");
  const scroll = usePageScroll();
  const flashOn = useFlashInterval();
  const { timers, refreshTimers, toggleTimer, openSelectedTask } = useTaskTimer(setMessage);
  const { createPrForTask } = usePrWorkflow(setMessage);
  const { createBranchForTask } = useBranchWorkflow(setMessage, createPrForTask);

  createEffect(() => {
    const sel = selectedTask();
    if (sel && scroll) {
      scroll.scrollChildIntoView(`task-${sel.projectId}-${sel.taskId}`);
    }
  });

  const selectedMyWorkTask = (): MyWorkTask | null => {
    const selected = selectedTask();
    if (!selected) return null;

    return (
      projectGroups()
        .find((group) => group.projectId === selected.projectId)
        ?.tasks.find((task) => task.id === selected.taskId) ?? null
    );
  };

  const loadMyWork = async () => {
    setMessage("Loading my tasks...");
    setCurrentUser(null);
    setProjectGroups([]);
    setSelectedTask(null);

    try {
      const authStatus = await getTeamworkAuthStatus();
      setTeamworkAuthStatus(authStatus);

      if (authStatus === "missing") {
        setMessage(
          "Teamwork auth not configured. Use Settings or `wtc config auth set` to add your API token.",
        );
        return;
      }

      const user = await getTeamworkCurrentUser();
      setCurrentUser(user);

      const groups = await getTeamworkMyTasksGrouped(user.id);
      setProjectGroups(groups);
      setSelectedTask(getNextMyWorkSelection(groups, null, 1));
      setMessage(
        groups.length > 0
          ? `Found ${groups.reduce((sum, g) => sum + g.tasks.length, 0)} tasks across ${groups.length} projects.`
          : "No tasks found for the next 7 days.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load my tasks.");
    }
  };

  useBindings(() => ({
    enabled: !dialog.active(),
    bindings: [
      {
        key: "down",
        desc: "Next task",
        group: "My Work",
        cmd: () => {
          setSelectedTask((current) => getNextMyWorkSelection(projectGroups(), current, 1));
        },
      },
      {
        key: "up",
        desc: "Previous task",
        group: "My Work",
        cmd: () => {
          setSelectedTask((current) => getNextMyWorkSelection(projectGroups(), current, -1));
        },
      },
      {
        key: "ctrl+o",
        desc: "Open task in browser",
        group: "My Work",
        cmd: () => openSelectedTask(selectedMyWorkTask()),
      },
      {
        key: "ctrl+t",
        desc: "Start/pause local timer",
        group: "My Work",
        cmd: () => toggleTimer(selectedMyWorkTask()),
      },
      {
        key: "ctrl+b",
        desc: "Create branch for selected task",
        group: "My Work",
        cmd: () => createBranchForTask(selectedMyWorkTask()),
      },
      {
        key: "ctrl+r",
        desc: "Create PR for selected task",
        group: "My Work",
        cmd: () => createPrForTask(selectedMyWorkTask()),
      },
    ],
  }));

  onMount(() => {
    void loadMyWork();
    void refreshTimers();
  });

  const user = currentUser();

  return (
    <box flexDirection="column" gap={1}>
      <Card title={`My Work${user ? ` — ${user.name}` : ""}`}>
        <text fg={tokens.textDim}>{message()}</text>
      </Card>

      <For each={projectGroups()}>
        {(group) => (
          <Card title={group.projectName || "Unknown project"}>
            <TaskList
              taskListId={group.projectId}
              tasks={group.tasks}
              emptyMessage="No tasks."
              selectedTaskId={
                selectedTask()?.projectId === group.projectId ? selectedTask()?.taskId : null
              }
              timers={timers()}
              flashOn={flashOn()}
            />
          </Card>
        )}
      </For>
    </box>
  );
}

/** Flattens all tasks across project groups into a flat ordered selection array. */
function getMyWorkSelectionOrder(groups: readonly ProjectTaskGroup[]): MyWorkSelection[] {
  return groups.flatMap((group) =>
    group.tasks.map((task) => ({ projectId: group.projectId, taskId: task.id })),
  );
}

/** Cycles to the next or previous task across all groups, wrapping around. */
function getNextMyWorkSelection(
  groups: readonly ProjectTaskGroup[],
  current: MyWorkSelection | null,
  direction: 1 | -1,
): MyWorkSelection | null {
  const order = getMyWorkSelectionOrder(groups);
  if (!order.length) return null;

  const currentIndex = current
    ? order.findIndex((sel) => sel.projectId === current.projectId && sel.taskId === current.taskId)
    : -1;
  const fallbackIndex = direction === 1 ? 0 : order.length - 1;
  const nextIndex =
    currentIndex === -1 ? fallbackIndex : (currentIndex + direction + order.length) % order.length;

  return order[nextIndex] ?? null;
}
