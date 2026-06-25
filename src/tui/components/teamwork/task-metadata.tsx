import type { TeamworkTask } from "../../../api/teamwork/task-list-tasks.ts";

/** Builds an array of description strings for a task's metadata row. */
export function buildTaskMetadata(task: TeamworkTask): string[] {
  const parts: string[] = [];

  if (task.assignees.length > 0) {
    parts.push(`Assignees: ${task.assignees.join(", ")}`);
  }
  if (task.dueDate) {
    parts.push(`Due: ${task.dueDate}`);
  }
  if (task.boardColumn) {
    parts.push(`Board: ${task.boardColumn.name}`);
  }
  if (task.priority) {
    parts.push(`Priority: ${task.priority}`);
  }

  return parts;
}
