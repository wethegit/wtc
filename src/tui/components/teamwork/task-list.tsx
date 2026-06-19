import { For } from "solid-js";

import type { TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import { tokens } from "../../tokens.ts";

export function TaskList(props: { tasks: readonly TeamworkTask[]; emptyMessage: string }) {
  return props.tasks.length ? (
    <For each={props.tasks}>
      {(task) => (
        <text fg={tokens.textDim}>
          {task.name}
          {task.status ? ` [${task.status}]` : ""}
        </text>
      )}
    </For>
  ) : (
    <text fg={tokens.textDim}>{props.emptyMessage}</text>
  );
}
