import { loadResolvedConfig, saveProjectConfig } from "../../config/manager.ts";
import {
  PROJECT_CONFIG_VERSION,
  type ProjectConfig,
  type ResolvedConfig,
} from "../../config/schema.ts";
import { getTeamworkTaskListTasks, type TeamworkTask } from "../../teamwork/task-list-tasks.ts";
import { getTeamworkTaskReference } from "../../teamwork/tasks.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";

interface PinnedTaskListResult {
  id: number;
  name: string;
  tasks: TeamworkTask[];
  error: string | null;
}

interface PinnedTaskListsResult {
  projectConfigPath: string | null;
  taskLists: PinnedTaskListResult[];
}

interface TeamworkTaskListPinnedActions {
  loadResolvedConfig: (startDir: string) => Promise<ResolvedConfig>;
  getTeamworkTaskListTasks: (taskListId: number) => Promise<TeamworkTask[]>;
}

interface TeamworkTaskListConfigActions {
  loadResolvedConfig: (startDir: string) => Promise<ResolvedConfig>;
  saveProjectConfig: (config: ProjectConfig, startDir: string) => Promise<string>;
}

interface TeamworkTaskOpenActions {
  openUrlInBrowser: (url: string) => Promise<void>;
}

const teamworkTaskListPinnedActions: TeamworkTaskListPinnedActions = {
  loadResolvedConfig,
  getTeamworkTaskListTasks,
};

const teamworkTaskListConfigActions: TeamworkTaskListConfigActions = {
  loadResolvedConfig,
  saveProjectConfig,
};

const teamworkTaskOpenActions: TeamworkTaskOpenActions = {
  openUrlInBrowser,
};

/**
 * Formats a task's metadata fields into human-readable text lines for CLI output.
 *
 * Example output: `["assignee: Marlon Bain", "due: 2026-06-24", "board: To Do", "priority: high"]`
 */
function formatTeamworkTaskMetadata(task: TeamworkTask): string[] {
  const metadata: string[] = [];

  if (task.assignees.length === 1) metadata.push(`assignee: ${task.assignees[0]}`);
  if (task.assignees.length > 1) metadata.push(`assignees: ${task.assignees.join(", ")}`);
  if (task.dueDate) metadata.push(`due: ${task.dueDate}`);
  if (task.boardColumn) metadata.push(`board: ${task.boardColumn.name}`);
  if (task.priority) metadata.push(`priority: ${task.priority}`);

  return metadata;
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
export function formatTeamworkTaskListPinnedOutput(
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
      const metadata = formatTeamworkTaskMetadata(task);
      if (metadata.length) lines.push(`    ${metadata.join(" | ")}`);
    }
  }

  return lines.join("\n");
}

/** Prints pinned task lists and their tasks for the current project. */
export async function teamworkTaskListPinned(
  args: { json: boolean; startDir?: string },
  actions = teamworkTaskListPinnedActions,
): Promise<void> {
  const config = await actions.loadResolvedConfig(args.startDir ?? process.cwd());
  const taskLists = config.project?.teamwork.pinnedTaskLists ?? [];
  const result: PinnedTaskListsResult = {
    projectConfigPath: config.paths.projectConfigPath,
    taskLists: [],
  };

  for (const taskList of taskLists) {
    try {
      result.taskLists.push({
        id: taskList.id,
        name: taskList.name,
        tasks: await actions.getTeamworkTaskListTasks(taskList.id),
        error: null,
      });
    } catch (error) {
      result.taskLists.push({
        id: taskList.id,
        name: taskList.name,
        tasks: [],
        error: error instanceof Error ? error.message : "Failed to load task list.",
      });
    }
  }

  console.log(formatTeamworkTaskListPinnedOutput(result, { json: args.json }));
}

/** Pins a task list by ID in the nearest project config, or updates the display name if already pinned. */
export async function teamworkTaskListPin(
  args: { taskListId: number; name: string; startDir?: string },
  actions = teamworkTaskListConfigActions,
): Promise<void> {
  if (!Number.isInteger(args.taskListId) || args.taskListId <= 0) {
    throw new Error("Teamwork task list ID must be a positive integer.");
  }

  const name = args.name.trim();
  if (!name) throw new Error("Teamwork task list name cannot be empty.");

  const startDir = args.startDir ?? process.cwd();
  const config = await actions.loadResolvedConfig(startDir);
  const projectConfig: ProjectConfig = config.project ?? {
    version: PROJECT_CONFIG_VERSION,
    project: { links: [] },
    teamwork: { projectId: null, pinnedTaskLists: [] },
  };
  const existing = projectConfig.teamwork.pinnedTaskLists.find(
    (taskList) => taskList.id === args.taskListId,
  );

  if (existing) {
    existing.name = name;
  } else {
    projectConfig.teamwork.pinnedTaskLists.push({ id: args.taskListId, name });
  }

  const path = await actions.saveProjectConfig(projectConfig, startDir);
  console.log(`Pinned Teamwork task list: ${name} (${args.taskListId}) in ${path}`);
}

/** Removes a pinned task list from the nearest project config by ID. */
export async function teamworkTaskListUnpin(
  args: { taskListId: number; startDir?: string },
  actions = teamworkTaskListConfigActions,
): Promise<void> {
  if (!Number.isInteger(args.taskListId) || args.taskListId <= 0) {
    throw new Error("Teamwork task list ID must be a positive integer.");
  }

  const startDir = args.startDir ?? process.cwd();
  const config = await actions.loadResolvedConfig(startDir);
  if (!config.project) throw new Error("Project config not found. Run `wtc config init` first.");

  const existing = config.project.teamwork.pinnedTaskLists.find(
    (taskList) => taskList.id === args.taskListId,
  );
  if (!existing) throw new Error(`Pinned Teamwork task list not found: ${args.taskListId}`);

  config.project.teamwork.pinnedTaskLists = config.project.teamwork.pinnedTaskLists.filter(
    (taskList) => taskList.id !== args.taskListId,
  );

  const path = await actions.saveProjectConfig(config.project, startDir);
  console.log(`Unpinned Teamwork task list: ${existing.name} (${existing.id}) from ${path}`);
}

/** Opens a Teamwork task in the default browser from a task ID or URL. */
export async function teamworkTaskOpen(
  args: { task: string },
  actions = teamworkTaskOpenActions,
): Promise<void> {
  const task = getTeamworkTaskReference(args.task);
  await actions.openUrlInBrowser(task.url);
  console.log(`Opened Teamwork task: ${task.url}`);
}
