import { z } from "zod";

import { logWarn } from "../logs/manager.ts";
import { fetchTeamworkApiJson } from "./client.ts";
import { getWorkflowStageNames } from "./workflow-stages.ts";

const TeamworkIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/).transform(Number),
]);

const TeamworkNamedValueSchema = z.union([
  z.string(),
  z.looseObject({
    id: TeamworkIdSchema.optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    value: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
]);

type TeamworkNamedValue = z.infer<typeof TeamworkNamedValueSchema>;

const TeamworkDateValueSchema = z.union([
  z.string(),
  z.looseObject({
    date: z.string().optional(),
    value: z.string().optional(),
  }),
]);

type TeamworkDateValue = z.infer<typeof TeamworkDateValueSchema>;

const TeamworkIncludedNamedValueSchema = z.looseObject({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  title: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type TeamworkIncludedNamedValue = z.infer<typeof TeamworkIncludedNamedValueSchema>;

const TeamworkTaskApiSchema = z.object({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  assigneeUsers: z.array(TeamworkNamedValueSchema).nullable().optional(),
  assigneeUserIds: z.array(TeamworkIdSchema).nullable().optional(),
  dueDate: TeamworkDateValueSchema.nullable().optional(),
  column: TeamworkNamedValueSchema.nullable().optional(),
  priority: TeamworkNamedValueSchema.nullable().optional(),
  workflowStages: z
    .array(
      z.looseObject({
        workflowId: TeamworkIdSchema.optional(),
        stageId: TeamworkIdSchema.optional(),
      }),
    )
    .nullable()
    .optional(),
});

const TeamworkIncludedSchema = z.looseObject({
  users: z.record(z.string(), TeamworkIncludedNamedValueSchema).optional(),
});

const TeamworkTaskListTasksResponseSchema = z.object({
  tasks: z.array(TeamworkTaskApiSchema),
  included: TeamworkIncludedSchema.optional(),
});

/** A normalized Teamwork task with resolved metadata fields. */
export interface TeamworkTask {
  /** Teamwork task ID. */
  id: number;
  /** Human-readable task name shown in WTC. */
  name: string;
  /** Optional Teamwork task status when the API includes it. */
  status: string | null;
  /** Optional browser URL when the API includes it. */
  url: string | null;
  /** People assigned to the task when Teamwork includes assignee data. */
  assignees: string[];
  /** Due date in a display-safe `YYYY-MM-DD` shape when available. */
  dueDate: string | null;
  /** Teamwork board column with name and optional color from the API, absent when not resolved. */
  boardColumn?: { name: string; color: string | null } | null;
  /** Teamwork task priority when available. */
  priority: string | null;
}

function getNamedValue(value: TeamworkNamedValue | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;

  const combinedName = [value.firstName, value.lastName]
    .flatMap((part) => (part?.trim() ? [part.trim()] : []))
    .join(" ");
  return value.name?.trim() || value.title?.trim() || value.value?.trim() || combinedName || null;
}

function getIncludedNamedValue(value: TeamworkIncludedNamedValue | undefined): string | null {
  if (!value) return null;

  const combinedName = [value.firstName, value.lastName]
    .flatMap((part) => (part?.trim() ? [part.trim()] : []))
    .join(" ");
  return value.name?.trim() || combinedName || value.title?.trim() || null;
}

function getIncludedValueById(
  values: Record<string, TeamworkIncludedNamedValue> | undefined,
  id: number | null | undefined,
): TeamworkIncludedNamedValue | null {
  if (id === null || id === undefined || !values) return null;
  return values[id.toString()] ?? Object.values(values).find((value) => value.id === id) ?? null;
}

function getReferencedName(
  value: TeamworkNamedValue | undefined,
  included: Record<string, TeamworkIncludedNamedValue> | undefined,
): string | null {
  const valueId = value && typeof value !== "string" ? (value.id ?? null) : null;
  return (
    getNamedValue(value) ??
    getIncludedNamedValue(getIncludedValueById(included, valueId) ?? undefined)
  );
}

/** Extracts a Teamwork v3 due date and normalizes `YYYYMMDD` and ISO timestamp strings to `YYYY-MM-DD`. */
function parseTeamworkDueDate(dueDate: TeamworkDateValue | null | undefined): string | null {
  const raw = dueDate ?? undefined;
  const extracted = !raw ? null : typeof raw === "string" ? raw : (raw.date ?? raw.value ?? null);
  const trimmed = extracted?.trim();
  if (!trimmed) return null;
  if (/^\d{8}$/.test(trimmed))
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

/** Fetches tasks for a Teamwork task list and resolves workflow stage names, assignees, due dates, and priority. */
export async function getTeamworkTaskListTasks(taskListId: number): Promise<TeamworkTask[]> {
  let parsed: z.infer<typeof TeamworkTaskListTasksResponseSchema>;
  try {
    parsed = TeamworkTaskListTasksResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasklists/${taskListId}/tasks.json?include=users,assigneeUsers`),
    );
  } catch (error) {
    logWarn("teamwork", "taskList.get.error", `Failed to fetch task list ${taskListId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const workflowIds = [
    ...new Set(
      parsed.tasks.flatMap(
        (task) =>
          task.workflowStages?.flatMap((stage) =>
            stage.workflowId && stage.stageId ? [stage.workflowId.toString()] : [],
          ) ?? [],
      ),
    ),
  ];
  const stageEntries = new Map<number, { name: string; color: string | null }>();
  for (const workflowId of workflowIds) {
    try {
      const entries = await getWorkflowStageNames(Number(workflowId));
      for (const [id, entry] of entries) {
        stageEntries.set(id, entry);
      }
    } catch (error) {
      logWarn(
        "teamwork",
        "taskList.stageNames.error",
        `Failed to fetch workflow stages for ${workflowId}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const tasks: TeamworkTask[] = [];
  for (const task of parsed.tasks) {
    const name = task.name ?? task.title ?? task.content;
    if (!name) throw new Error("Teamwork task response did not include a task name.");

    const assignees = [
      ...new Set([
        ...(task.assigneeUsers?.flatMap((assignee) => {
          const name = getReferencedName(assignee, parsed.included?.users);
          return name ? [name] : [];
        }) ?? []),
        ...(task.assigneeUserIds?.flatMap((id) => {
          const name = getIncludedNamedValue(
            getIncludedValueById(parsed.included?.users, id) ?? undefined,
          );
          return name ? [name] : [];
        }) ?? []),
      ]),
    ];

    tasks.push({
      id: task.id,
      name,
      status: task.status ?? null,
      url: task.url ?? null,
      assignees,
      dueDate: parseTeamworkDueDate(task.dueDate),
      boardColumn: task.workflowStages?.[0]?.stageId
        ? (stageEntries.get(task.workflowStages[0].stageId) ?? null)
        : null,
      priority: getNamedValue(task.priority),
    });
  }

  return tasks;
}

/** A pinned task list with its fetched tasks (or an error message). */
export interface PinnedTaskListFetchResult {
  id: number;
  name: string;
  tasks: TeamworkTask[];
  error: string | null;
}

/**
 * Fetches tasks for each pinned task list with per-list error isolation.
 * A single failing list does not prevent the others from loading.
 */
export async function getPinnedTaskListTasks(
  pinnedTaskLists: readonly { id: number; name: string }[],
): Promise<PinnedTaskListFetchResult[]> {
  const results: PinnedTaskListFetchResult[] = [];

  for (const taskList of pinnedTaskLists) {
    try {
      results.push({
        id: taskList.id,
        name: taskList.name,
        tasks: await getTeamworkTaskListTasks(taskList.id),
        error: null,
      });
    } catch (error) {
      results.push({
        id: taskList.id,
        name: taskList.name,
        tasks: [],
        error: error instanceof Error ? error.message : "Failed to load task list.",
      });
    }
  }

  return results;
}
