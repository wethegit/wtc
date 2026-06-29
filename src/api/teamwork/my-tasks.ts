import { z } from "zod";

import { logError } from "../logs/manager.ts";
import { fetchTeamworkApiJson } from "./client.ts";
import { TEAMWORK_BASE_URL } from "./consts.ts";

const TeamworkIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/).transform(Number),
]);

const TeamworkDateValueSchema = z.union([
  z.string(),
  z.object({
    date: z.string().optional(),
    value: z.string().optional(),
  }),
]);

const TeamworkNamedValueSchema = z.union([
  z.string(),
  z.object({
    id: TeamworkIdSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
  }),
]);

const TeamworkMyTaskApiSchema = z.object({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  assigneeUsers: z.array(TeamworkNamedValueSchema).nullable().optional(),
  assigneeUserIds: z.array(TeamworkIdSchema).nullable().optional(),
  dueDate: TeamworkDateValueSchema.nullable().optional(),
  priority: TeamworkNamedValueSchema.nullable().optional(),
  tasklistId: TeamworkIdSchema.optional(),
});

const TeamworkIncludedTasklistSchema = z.object({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  projectId: TeamworkIdSchema.optional(),
});

const TeamworkIncludedProjectSchema = z.object({
  id: TeamworkIdSchema,
  name: z.string().optional(),
});

const TeamworkIncludedSchema = z.object({
  tasklists: z.record(z.string(), TeamworkIncludedTasklistSchema).optional(),
  projects: z.record(z.string(), TeamworkIncludedProjectSchema).optional(),
});

const TeamworkMyTasksApiResponseSchema = z.object({
  tasks: z.array(TeamworkMyTaskApiSchema),
  included: TeamworkIncludedSchema.optional(),
});

/** A Teamwork task assigned to the current user, grouped under a project. */
export interface MyWorkTask {
  /** Teamwork task ID. */
  id: number;
  /** Human-readable task name. */
  name: string;
  /** Teamwork status (e.g. "new", "active"). */
  status: string | null;
  /** Browser URL for the task. */
  url: string | null;
  /** Teamwork project ID the task belongs to. */
  projectId: number;
  /** Human-readable project name. */
  projectName: string;
  /** Due date in `YYYY-MM-DD` format, if set. */
  dueDate: string | null;
  /** Display-safe assignee names. */
  assignees: string[];
  /** Task priority label, if set. */
  priority: string | null;
}

/** A project with its assigned tasks, used for TUI grouping. */
export interface ProjectTaskGroup {
  projectId: number;
  projectName: string;
  tasks: MyWorkTask[];
}

/** Normalizes a Teamwork date value to `YYYY-MM-DD`. */
function normalizeDate(
  raw: string | { date?: string; value?: string } | null | undefined,
): string | null {
  if (!raw) return null;
  const extracted = typeof raw === "string" ? raw : (raw.date ?? raw.value);
  if (!extracted) return null;
  const trimmed = extracted.trim();
  if (!trimmed) return null;
  if (/^\d{8}$/.test(trimmed))
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

/** Extracts a display-safe name from a Teamwork named value. */
function getNamedValue(
  value: string | { name?: string; id?: unknown; type?: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return value.name?.trim() || null;
}

/**
 * Fetches tasks assigned to the current user for the next 7 days (including overdue).
 * Tasks are grouped by project using included tasklist and project data.
 * Does NOT cache — task lists change too frequently.
 */
async function getTeamworkMyTasks(userId: number): Promise<MyWorkTask[]> {
  const query = new URLSearchParams({
    responsiblePartyIds: String(userId),
    includeTeamUserIds: "true",
    taskFilter: "within7",
    includeOverdueTasks: "true",
    include: "tasklists,projects",
  });

  let parsed: z.infer<typeof TeamworkMyTasksApiResponseSchema>;
  try {
    parsed = TeamworkMyTasksApiResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasks.json?${query}`),
    );
  } catch (error) {
    logError("teamwork", "myTasks.get.error", "Failed to fetch my tasks", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // Build tasklistId -> projectId mapping from included tasklists
  const tasklistToProject = new Map<number, number>();
  for (const entry of Object.values(parsed.included?.tasklists ?? {})) {
    if (entry.projectId) {
      tasklistToProject.set(entry.id, entry.projectId);
    }
  }

  // Build projectId -> projectName mapping from included projects
  const projectNames = new Map<number, string>();
  for (const entry of Object.values(parsed.included?.projects ?? {})) {
    const name = entry.name?.trim();
    if (name) {
      projectNames.set(entry.id, name);
    }
  }

  const tasks: MyWorkTask[] = [];
  for (const task of parsed.tasks) {
    const name = task.name ?? task.title ?? task.content;
    if (!name) continue;

    const tasklistId = task.tasklistId;
    let projectId: number | null = null;
    let projectName = "";

    if (tasklistId) {
      projectId = tasklistToProject.get(tasklistId) ?? null;
      if (projectId) {
        projectName = projectNames.get(projectId) ?? "";
      }
    }

    tasks.push({
      id: task.id,
      name,
      status: task.status ?? null,
      url: task.url ?? `${TEAMWORK_BASE_URL}/app/tasks/${task.id}`,
      projectId: projectId ?? 0,
      projectName,
      dueDate: normalizeDate(task.dueDate),
      assignees: (task.assigneeUsers ?? [])
        .map((a) => getNamedValue(a))
        .filter((n): n is string => n !== null),
      priority: getNamedValue(task.priority),
    });
  }

  return tasks;
}

/**
 * Fetches the current user's tasks and groups them by project (alphabetically).
 * Within each group, tasks are sorted by due date (ascending, nulls last).
 */
export async function getTeamworkMyTasksGrouped(userId: number): Promise<ProjectTaskGroup[]> {
  const tasks = await getTeamworkMyTasks(userId);

  // Group by project ID
  const groups = new Map<number, ProjectTaskGroup>();
  for (const task of tasks) {
    let group = groups.get(task.projectId);
    if (!group) {
      group = { projectId: task.projectId, projectName: task.projectName, tasks: [] };
      groups.set(task.projectId, group);
    }
    group.tasks.push(task);
  }

  // Sort tasks within each group by due date (ascending, nulls last)
  for (const group of groups.values()) {
    group.tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  // Sort groups alphabetically by project name
  return [...groups.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
}
