import { Show } from "solid-js";
import { t, bold, fg } from "@opentui/core";

import type { TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import { tokens, palette } from "../../tokens.ts";

function priorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
    case "high":
      return palette.red;
    case "medium":
      return palette.yellow75;
    case "low":
      return palette.green75;
    default:
      return palette.black50;
  }
}

/** Renders a task's metadata (assignees, due date, board column, priority) as a row of styled inline fields. */
export function TaskMetadata(props: { task: TeamworkTask }) {
  const task = () => props.task;

  return (
    <Show
      when={task().assignees.length > 0 || task().dueDate || task().boardColumn || task().priority}
    >
      <box flexDirection="row" gap={2}>
        <Show when={task().assignees.length > 0}>
          <text fg={tokens.textDim}>{t`${bold("assignee:")} ${task().assignees.join(", ")}`}</text>
        </Show>
        <Show when={task().dueDate}>
          <text fg={tokens.textDim}>{t`${bold("due:")} ${task().dueDate ?? ""}`}</text>
        </Show>
        <Show when={task().boardColumn}>
          <text fg={tokens.textDim}>{t`${bold("board:")} ${task().boardColumn ?? ""}`}</text>
        </Show>
        <Show when={task().priority}>
          <text
            fg={tokens.textDim}
          >{t`${bold("priority:")} ${fg(priorityColor(task().priority ?? ""))(task().priority ?? "")}`}</text>
        </Show>
      </box>
    </Show>
  );
}
