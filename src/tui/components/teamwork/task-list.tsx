import { For } from "solid-js";
import { TextAttributes } from "@opentui/core";

import type { TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import { tokens } from "../../tokens.ts";

export function TaskList(props: {
  tasks: readonly TeamworkTask[];
  emptyMessage: string;
  selectedTaskId?: number | null;
}) {
  return props.tasks.length ? (
    <For each={props.tasks}>
      {(task) => (
        <text
          attributes={props.selectedTaskId === task.id ? TextAttributes.BOLD : undefined}
          fg={props.selectedTaskId === task.id ? tokens.accent : tokens.textDim}
        >
          {props.selectedTaskId === task.id ? "> " : "  "}
          {task.name}
          {task.status ? ` [${task.status}]` : ""}
        </text>
      )}
    </For>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
