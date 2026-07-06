import { For } from "solid-js";

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
  const timerBadge = (taskId: number): TimerBadgeProps | null => {
    const timers = props.timers;
    if (!timers) return null;

    const matchingTimers = timers.filter((t) => t.taskId === taskId);
    const timer =
      matchingTimers.find((t) => t.running) ??
      matchingTimers.sort(
        (a, b) => new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime(),
      )[0];
    if (!timer) return null;

    return {
      elapsedMs: getTimerElapsedMs(timer, props.now ?? new Date()),
      running: timer.running,
      flashOn: props.flashOn,
    };
  };

  return props.tasks.length ? (
    <box gap={0}>
      <For each={props.tasks}>
        {(task) => {
          const badge = timerBadge(task.id);

          return (
            <ListItem
              id={`task-${props.taskListId}-${task.id}`}
              title={task.name}
              metadata={buildTaskMetadata(task)}
              selected={props.selectedTaskId === task.id}
              badge={badge ? <TimerBadge {...badge} /> : undefined}
            />
          );
        }}
      </For>
    </box>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
