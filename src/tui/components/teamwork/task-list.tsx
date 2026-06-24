import { For, Show } from "solid-js";

import type { TeamworkTask } from "../../../teamwork/task-list-tasks.ts";

import { tokens } from "../../tokens.ts";

import { buildTaskMetadata } from "./task-metadata.tsx";
import { TimerIndicator } from "./timer-indicator.tsx";
import { Section } from "../layout/section.tsx";

/** Renders a list of tasks with name, status, and styled metadata row. Supports keyboard selection highlight. */
export function TaskList(props: {
  taskListId: number;
  tasks: readonly TeamworkTask[];
  emptyMessage: string;
  selectedTaskId?: number | null;
  timerTaskIds?: readonly number[];
  runningTaskId?: number | null;
  flashOn?: boolean;
}) {
  return props.tasks.length ? (
    <box gap={1}>
      <For each={props.tasks}>
        {(task) => {
          const timerStatus = () =>
            props.timerTaskIds?.includes(task.id)
              ? props.runningTaskId === task.id
                ? "running"
                : "stopped"
              : null;

          return (
            <box id={`task-${props.taskListId}-${task.id}`}>
              <Section
                active={props.selectedTaskId === task.id}
                title={task.name}
                description={buildTaskMetadata(task)}
              >
                <Show when={timerStatus()}>
                  <TimerIndicator status={timerStatus() ?? "stopped"} flashOn={props.flashOn} />
                </Show>
              </Section>
            </box>
          );
        }}
      </For>
    </box>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
