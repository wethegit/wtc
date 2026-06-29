import { loadResolvedConfig, saveProjectConfig } from "../../api/config/manager.ts";
import { PROJECT_CONFIG_VERSION, type ProjectConfig } from "../../api/config/schema.ts";
import { getPinnedTaskListTasks } from "../../api/teamwork/task-list-tasks.ts";
import type { PinnedTaskListFetchResult } from "../../api/teamwork/task-list-tasks.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { getTeamworkCurrentUserId } from "../../api/teamwork/user.ts";
import { getTeamworkMyTasksGrouped, type MyWorkTask } from "../../api/teamwork/my-tasks.ts";

interface PinnedTaskListsResult {
  projectConfigPath: string | null;
  taskLists: PinnedTaskListFetchResult[];
}

/**
 * Formats pinned task list output for CLI display.
 *
 * Example output:
 * ```
 * Project config: /repo/.wtc.yaml
 * Pinned task lists:
 * General Tasks (1597639)
 *   - Dev | Code Review [active]
 *     assignee: Marlon Bain | due: 2026-06-24 | board: To Do | priority: high
 * ```
 */
function formatTeamworkTaskListPinnedOutput(
  result: PinnedTaskListsResult,
  options: { json: boolean },
): string {
  if (options.json) return JSON.stringify(result, null, 2);

  const lines = [`Project config: ${result.projectConfigPath ?? "not found"}`];

  if (!result.taskLists.length) {
    lines.push("No pinned task lists configured.");
    return lines.join("\n");
  }

  lines.push("Pinned task lists:");
  for (const taskList of result.taskLists) {
    lines.push(`${taskList.name} (${taskList.id})`);

    if (taskList.error) {
      lines.push(`  Error: ${taskList.error}`);
      continue;
    }

    if (!taskList.tasks.length) {
      lines.push("  No tasks found.");
      continue;
    }

    for (const task of taskList.tasks) {
      lines.push(`  - ${task.name}${task.status ? ` [${task.status}]` : ""}`);
      const metadata: string[] = [];
      if (task.assignees.length === 1) metadata.push(`assignee: ${task.assignees[0]}`);
      if (task.assignees.length > 1) metadata.push(`assignees: ${task.assignees.join(", ")}`);
      if (task.dueDate) metadata.push(`due: ${task.dueDate}`);
      if (task.boardColumn) metadata.push(`board: ${task.boardColumn.name}`);
      if (task.priority) metadata.push(`priority: ${task.priority}`);
      if (metadata.length) lines.push(`    ${metadata.join(" | ")}`);
    }
  }

  return lines.join("\n");
}

/** Prints pinned task lists and their tasks for the current project. */
export async function teamworkTaskListPinned(args: {
  json: boolean;
  startDir?: string;
}): Promise<void> {
  const config = await loadResolvedConfig(args.startDir ?? process.cwd());
  const taskLists = config.project?.teamwork.pinnedTaskLists ?? [];
  const result: PinnedTaskListsResult = {
    projectConfigPath: config.paths.projectConfigPath,
    taskLists: await getPinnedTaskListTasks(taskLists),
  };

  console.log(formatTeamworkTaskListPinnedOutput(result, { json: args.json }));
}

/** Pins a task list by ID in the nearest project config, or updates the display name if already pinned. */
export async function teamworkTaskListPin(args: {
  taskListId: number;
  name: string;
  startDir?: string;
}): Promise<void> {
  if (!Number.isInteger(args.taskListId) || args.taskListId <= 0) {
    throw new Error("Teamwork task list ID must be a positive integer.");
  }

  const name = args.name.trim();
  if (!name) throw new Error("Teamwork task list name cannot be empty.");

  const startDir = args.startDir ?? process.cwd();
  const config = await loadResolvedConfig(startDir);
  const projectConfig: ProjectConfig = config.project ?? {
    version: PROJECT_CONFIG_VERSION,
    project: { links: [] },
    teamwork: { projectId: null, reviewTaskId: null, pinnedTaskLists: [] },
  };
  const existing = projectConfig.teamwork.pinnedTaskLists.find(
    (taskList) => taskList.id === args.taskListId,
  );

  if (existing) {
    existing.name = name;
  } else {
    projectConfig.teamwork.pinnedTaskLists.push({ id: args.taskListId, name });
  }

  const path = await saveProjectConfig(projectConfig, startDir);
  console.log(`Pinned Teamwork task list: ${name} (${args.taskListId}) in ${path}`);
}

/** Removes a pinned task list from the nearest project config by ID. */
export async function teamworkTaskListUnpin(args: {
  taskListId: number;
  startDir?: string;
}): Promise<void> {
  if (!Number.isInteger(args.taskListId) || args.taskListId <= 0) {
    throw new Error("Teamwork task list ID must be a positive integer.");
  }

  const startDir = args.startDir ?? process.cwd();
  const config = await loadResolvedConfig(startDir);
  if (!config.project) throw new Error("Project config not found. Run `wtc config init` first.");

  const existing = config.project.teamwork.pinnedTaskLists.find(
    (taskList) => taskList.id === args.taskListId,
  );
  if (!existing) throw new Error(`Pinned Teamwork task list not found: ${args.taskListId}`);

  config.project.teamwork.pinnedTaskLists = config.project.teamwork.pinnedTaskLists.filter(
    (taskList) => taskList.id !== args.taskListId,
  );

  const path = await saveProjectConfig(config.project, startDir);
  console.log(`Unpinned Teamwork task list: ${existing.name} (${existing.id}) from ${path}`);
}

/** Opens a Teamwork task in the default browser from a task ID or URL. */
export async function teamworkTaskOpen(args: { task: string }): Promise<void> {
  const task = getTeamworkTaskReference(args.task);
  await openUrlInBrowser(task.url);
  console.log(`Opened Teamwork task: ${task.url}`);
}

/**
 * Formats my tasks output for CLI display.
 *
 * Example output:
 * ```
 * Alpha Project:
 *   - Dev | Code Review [active]
 *     assignee: Marlon Marcello | due: 2026-06-24 | priority: high
 * Beta Project:
 *   - General | Meeting
 * ```
 */
function formatTeamworkTaskMineOutput(
  groups: { projectId: number; projectName: string; tasks: MyWorkTask[] }[],
  options: { json: boolean },
): string {
  if (options.json) return JSON.stringify(groups, null, 2);

  if (!groups.length) return "No tasks found for the next 7 days.";

  const lines: string[] = [];
  for (const group of groups) {
    if (!group.projectName) {
      lines.push("Unknown project:");
    } else {
      lines.push(`${group.projectName}:`);
    }

    for (const task of group.tasks) {
      lines.push(`  - ${task.name}${task.status ? ` [${task.status}]` : ""}`);
      const metadata: string[] = [];
      if (task.assignees.length === 1) metadata.push(`assignee: ${task.assignees[0]}`);
      if (task.assignees.length > 1) metadata.push(`assignees: ${task.assignees.join(", ")}`);
      if (task.dueDate) metadata.push(`due: ${task.dueDate}`);
      if (task.priority) metadata.push(`priority: ${task.priority}`);
      if (metadata.length) lines.push(`    ${metadata.join(" | ")}`);
    }
  }

  return lines.join("\n");
}

/** Lists tasks assigned to the current user due within the next 7 days (including overdue). */
export async function teamworkTaskMine(args: { json: boolean }): Promise<void> {
  const userId = await getTeamworkCurrentUserId();
  const groups = await getTeamworkMyTasksGrouped(userId);
  console.log(formatTeamworkTaskMineOutput(groups, { json: args.json }));
}
