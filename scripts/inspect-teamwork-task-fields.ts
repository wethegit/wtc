import { fetchTeamworkApiJson } from "../src/api/teamwork/client.ts";

type JsonObject = Record<string, unknown>;

// interface IncludedSummary { ... } — used by commented-out probes below

interface TaskFieldSummary {
  id: unknown;
  name: unknown;
  status: unknown;
  assignees: unknown;
  assigneeUsers: unknown;
  assigneeUserIds: unknown;
  dueDate: unknown;
  originalDueDate?: unknown;
  sequenceDueDate?: unknown;
  column?: unknown;
  workflowStages?: unknown;
  priority: unknown;
  projectId?: unknown;
  projectName?: unknown;
}

// interface TaskEndpointReport { ... }
// interface TaskListEndpointReport { ... }
// interface TaskListTasksEndpointReport { ... }
// interface TimerSummary { ... }
// interface TimersEndpointReport { ... }
// interface WorkflowEndpointReport { ... }

interface MeEndpointReport {
  endpoint: string;
  user: { id: unknown; name: unknown; email: unknown; avatarUrl: unknown } | null;
}

interface MyTasksEndpointReport {
  endpoint: string;
  taskCount: number;
  tasks: TaskFieldSummary[];
  topLevelKeys: string[];
  includedKeys: string[];
  firstTaskKeys: string[];
  sampleIncludedProjects: Record<string, unknown> | null;
  includedTasklist: Record<string, unknown> | null;
  firstTaskRaw: Record<string, unknown> | null;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getObject(value: JsonObject, key: string): JsonObject | null {
  const next = value[key];
  return isObject(next) ? next : null;
}

function getArray(value: JsonObject, key: string): readonly unknown[] {
  const next = value[key];
  return Array.isArray(next) ? next : [];
}

function summarizeTask(task: JsonObject): TaskFieldSummary {
  return {
    id: task.id,
    name: task.name ?? task.title ?? task.content,
    status: task.status,
    assignees: task.assignees,
    assigneeUsers: task.assigneeUsers,
    assigneeUserIds: task.assigneeUserIds,
    dueDate: task.dueDate,
    originalDueDate: task.originalDueDate ?? undefined,
    sequenceDueDate: task.sequenceDueDate ?? undefined,
    column: task.column ?? undefined,
    workflowStages: task.workflowStages ?? undefined,
    priority: task.priority,
    projectId: task.projectId ?? undefined,
    projectName: task.projectName ?? undefined,
  };
}

/* --- Unused probes for Phase 1–4, kept for reference ---

interface IncludedSummary {
  users: JsonObject[];
  stages: JsonObject[];
  workflowStages: JsonObject[];
}

function summarizeIncludedCollection(value: JsonObject | null): JsonObject[] {
  if (!value) return [];
  return Object.values(value).filter(isObject).map((item) => ({
    id: item.id, name: item.name, firstName: item.firstName,
    lastName: item.lastName, title: item.title, type: item.type,
  }));
}

function summarizeStages(value: JsonObject | null): JsonObject[] {
  if (!value) return [];
  return Object.values(value).filter(isObject).map((item) => ({
    id: item.id, name: item.name, color: item.color, displayOrder: item.displayOrder,
  }));
}

function summarizeIncluded(root: JsonObject): IncludedSummary {
  const included = getObject(root, "included");
  return {
    users: summarizeIncludedCollection(included ? getObject(included, "users") : null),
    stages: summarizeIncludedCollection(included ? getObject(included, "stages") : null),
    workflowStages: summarizeIncludedCollection(included ? getObject(included, "workflowStages") : null),
  };
}

async function inspectTask(taskId: number, include = false): Promise<TaskEndpointReport> {
  ...
}

async function inspectTaskList(taskListId: number, include = false): Promise<TaskListEndpointReport> {
  ...
}

async function inspectTaskListTasks(taskListId: number, include = false): Promise<TaskListTasksEndpointReport> {
  ...
}

async function inspectTimers(): Promise<TimersEndpointReport> {
  ...
}

async function inspectWorkflow(workflowId: number, include = false): Promise<WorkflowEndpointReport> {
  ...
}

const DEFAULT_WORKFLOW_IDS = [9] as const;

function parseIds(value: string | undefined, defaults: readonly number[]): number[] {
  ...
}

*/

async function inspectMe(): Promise<MeEndpointReport> {
  const endpoint = `/me.json`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const user = getObject(root, "person") ?? getObject(root, "user");

  return {
    endpoint,
    user: user
      ? {
          id: user.id,
          name: user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.email,
          avatarUrl: user.avatarUrl,
        }
      : null,
  };
}

async function inspectMyTasks(userId: number | string): Promise<MyTasksEndpointReport> {
  const query = new URLSearchParams({
    responsiblePartyIds: String(userId),
    includeTeamUserIds: "true",
    taskFilter: "within7",
    includeOverdueTasks: "true",
    include: "tasklists,projects",
  });
  const endpoint = `/tasks.json?${query}`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const tasks = getArray(root, "tasks").filter(isObject);
  const included = getObject(root, "included");

  const projects = getObject(included ?? {}, "projects");
  const sampleProject = projects ? (Object.values(projects).filter(isObject)[0] ?? null) : null;
  const tasklists = getObject(included ?? {}, "tasklists");
  const sampleTasklist = tasklists ? (Object.values(tasklists).filter(isObject)[0] ?? null) : null;
  const rawTask = tasks[0] ?? null;

  return {
    endpoint,
    taskCount: tasks.length,
    tasks: tasks.map(summarizeTask),
    topLevelKeys: Object.keys(root).sort(),
    includedKeys: included ? Object.keys(included).sort() : [],
    firstTaskKeys: rawTask ? Object.keys(rawTask).sort() : [],
    sampleIncludedProjects: projects
      ? {
          projectKeys: Object.keys(projects).sort(),
          sampleProject,
        }
      : null,
    includedTasklist: sampleTasklist
      ? {
          keys: Object.keys(sampleTasklist).sort(),
          projectId: sampleTasklist.projectId,
          name: sampleTasklist.name,
        }
      : null,
    firstTaskRaw: rawTask,
  };
}

async function inspectSafely<T>(
  label: string,
  inspect: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await inspect();
  } catch (error) {
    return {
      error: `${label}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

const me = await inspectSafely("me", () => inspectMe());
const userId = me && !("error" in me) && me.user?.id ? Number(me.user.id) : null;

const myTasks = userId
  ? await inspectSafely("myTasks", () => inspectMyTasks(userId))
  : { error: "Could not determine user ID from /me.json" };

const report = { me, myTasks };

console.log(JSON.stringify(report, null, 2));
