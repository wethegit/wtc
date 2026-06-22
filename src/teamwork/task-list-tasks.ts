import { z } from "zod";

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
  /** Teamwork board column, such as To Do, Blocked, or Completed. */
  boardColumn: string | null;
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

/** Extracts and normalizes a Teamwork v3 due date from its union shape (string | { date?, value? }) into YYYY-MM-DD. */
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
  const parsed = TeamworkTaskListTasksResponseSchema.parse(
    await fetchTeamworkApiJson(`/tasklists/${taskListId}/tasks.json?include=users,assigneeUsers`),
  );

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
  const stageNames = new Map<number, string>();
  for (const workflowId of workflowIds) {
    const names = await getWorkflowStageNames(Number(workflowId));
    for (const [id, name] of names) {
      stageNames.set(id, name);
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
        ? (stageNames.get(task.workflowStages[0].stageId) ?? null)
        : null,
      priority: getNamedValue(task.priority),
    });
  }

  return tasks;
}
