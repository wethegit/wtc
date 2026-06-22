import { For } from "solid-js";
import { TextAttributes } from "@opentui/core";

import type { TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import { tokens } from "../../tokens.ts";
import { TaskMetadata } from "./task-metadata.tsx";

/** Renders a list of tasks with name, status, and styled metadata row. Supports keyboard selection highlight. */
export function TaskList(props: {
  tasks: readonly TeamworkTask[];
  emptyMessage: string;
  selectedTaskId?: number | null;
}) {
  return props.tasks.length ? (
    <For each={props.tasks}>
      {(task) => (
        <box flexDirection="column" gap={0}>
          <text
            attributes={props.selectedTaskId === task.id ? TextAttributes.BOLD : undefined}
            fg={props.selectedTaskId === task.id ? tokens.accent : tokens.textDim}
          >
            {props.selectedTaskId === task.id ? "> " : "  "}
            {task.name}
            {task.status ? ` [${task.status}]` : ""}
          </text>
          <TaskMetadata task={task} />
        </box>
      )}
    </For>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
