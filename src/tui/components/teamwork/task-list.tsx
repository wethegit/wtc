import { createMemo, For, Show } from "solid-js";

import type { TeamworkTask } from "../../../api/teamwork/task-list-tasks.ts";
import { getTimerElapsedMs, type TeamworkTimer } from "../../../api/teamwork/timers/api.ts";

import { tokens } from "../../tokens.ts";

import { buildTaskMetadata } from "./task-metadata.tsx";
import { TimerBadge, type TimerBadgeProps } from "./timer-indicator.tsx";
import { ListItem } from "../layout/list-item.tsx";

/** Renders a list of tasks with compact list items, selection, and inline timer badges. */
export function TaskList(props: {
  taskListId: number;
  tasks: readonly TeamworkTask[];
  emptyMessage: string;
  selectedTaskId?: number | null;
  timers?: readonly TeamworkTimer[];
  now?: Date;
  flashOn?: boolean;
}) {
  const timerByTaskId = createMemo(() => {
    const byTask = new Map<number, TeamworkTimer>();

    for (const timer of props.timers ?? []) {
      if (!timer.taskId) continue;

      const current = byTask.get(timer.taskId);
      // Prefer the running timer; otherwise keep the most recently started timer for this task.
      if (
        !current ||
        (timer.running && !current.running) ||
        (!timer.running &&
          !current.running &&
          new Date(timer.lastStartedAt).getTime() > new Date(current.lastStartedAt).getTime())
      ) {
        byTask.set(timer.taskId, timer);
      }
    }

    return byTask;
  });

  const timerBadge = (taskId: number): TimerBadgeProps | null => {
    const timer = timerByTaskId().get(taskId);
    if (!timer) return null;

    return {
      elapsedMs: getTimerElapsedMs(timer, props.now ?? new Date()),
      running: timer.running,
      flashOn: props.flashOn,
    };
  };

  const TaskTimerBadge = (badgeProps: { taskId: number }) => (
    <Show when={timerBadge(badgeProps.taskId)}>
      {(badge: () => TimerBadgeProps) => <TimerBadge {...badge()} />}
    </Show>
  );

  return props.tasks.length ? (
    <box gap={0}>
      <For each={props.tasks}>
        {(task) => {
          return (
            <ListItem
              id={`task-${props.taskListId}-${task.id}`}
              title={task.name}
              metadata={buildTaskMetadata(task)}
              selected={props.selectedTaskId === task.id}
              badgeWhen={() => timerBadge(task.id) !== null}
              badge={<TaskTimerBadge taskId={task.id} />}
            />
          );
        }}
      </For>
    </box>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
