import { fetchTeamworkApiJson } from "../src/teamwork/client.ts";

const DEFAULT_TASK_IDS = [26523243, 26751525, 26751526] as const;
const DEFAULT_TASK_LIST_IDS = [1691926] as const;
const INCLUDE_QUERY = "include=users,workflowStages,stages,assigneeUsers";

type JsonObject = Record<string, unknown>;

interface IncludedSummary {
  users: JsonObject[];
  stages: JsonObject[];
  workflowStages: JsonObject[];
}

interface TaskFieldSummary {
  id: unknown;
  name: unknown;
  status: unknown;
  assignees: unknown;
  assigneeUsers: unknown;
  assigneeUserIds: unknown;
  dueDate: unknown;
  originalDueDate: unknown;
  sequenceDueDate: unknown;
  column: unknown;
  workflowStages: unknown;
  priority: unknown;
}

interface TaskEndpointReport {
  endpoint: string;
  taskKeys: string[];
  task: TaskFieldSummary | null;
  included: IncludedSummary;
}

interface TaskListEndpointReport {
  endpoint: string;
  tasklistKeys: string[];
  tasklist: JsonObject | null;
  includedKeys: string[];
}

interface TaskListTasksEndpointReport {
  endpoint: string;
  taskCount: number;
  taskKeys: string[][];
  tasks: TaskFieldSummary[];
  included: IncludedSummary;
}

interface TimerSummary {
  id: unknown;
  running: unknown;
  description: unknown;
  taskId: unknown;
  projectId: unknown;
  duration: unknown;
  lastStartedAt: unknown;
  timeLogId: unknown;
}

interface TimersEndpointReport {
  endpoint: string;
  timerCount: number;
  timers: TimerSummary[];
}

interface WorkflowEndpointReport {
  endpoint: string;
  workflow: JsonObject | null;
  includedStages: JsonObject[];
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

function summarizeIncludedCollection(value: JsonObject | null): JsonObject[] {
  if (!value) return [];

  return Object.values(value)
    .filter(isObject)
    .map((item) => ({
      id: item.id,
      name: item.name,
      firstName: item.firstName,
      lastName: item.lastName,
      title: item.title,
      type: item.type,
    }));
}

function summarizeStages(value: JsonObject | null): JsonObject[] {
  if (!value) return [];

  return Object.values(value)
    .filter(isObject)
    .map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      displayOrder: item.displayOrder,
    }));
}

function summarizeIncluded(root: JsonObject): IncludedSummary {
  const included = getObject(root, "included");

  return {
    users: summarizeIncludedCollection(included ? getObject(included, "users") : null),
    stages: summarizeIncludedCollection(included ? getObject(included, "stages") : null),
    workflowStages: summarizeIncludedCollection(
      included ? getObject(included, "workflowStages") : null,
    ),
  };
}

function summarizeTimer(timer: JsonObject): TimerSummary {
  return {
    id: timer.id,
    running: timer.running,
    description: timer.description,
    taskId: timer.taskId,
    projectId: timer.projectId,
    duration: timer.duration,
    lastStartedAt: timer.lastStartedAt,
    timeLogId: timer.timeLogId,
  };
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
    originalDueDate: task.originalDueDate,
    sequenceDueDate: task.sequenceDueDate,
    column: task.column,
    workflowStages: task.workflowStages,
    priority: task.priority,
  };
}

async function inspectTask(taskId: number, include = false): Promise<TaskEndpointReport> {
  const endpoint = `/tasks/${taskId}.json${include ? `?${INCLUDE_QUERY}` : ""}`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const task = getObject(root, "task");

  return {
    endpoint,
    taskKeys: task ? Object.keys(task).sort() : [],
    task: task ? summarizeTask(task) : null,
    included: summarizeIncluded(root),
  };
}

async function inspectTaskList(
  taskListId: number,
  include = false,
): Promise<TaskListEndpointReport> {
  const endpoint = `/tasklists/${taskListId}.json${include ? `?${INCLUDE_QUERY}` : ""}`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const tasklist = getObject(root, "tasklist");
  const included = getObject(root, "included");

  return {
    endpoint,
    tasklistKeys: tasklist ? Object.keys(tasklist).sort() : [],
    tasklist,
    includedKeys: included ? Object.keys(included).sort() : [],
  };
}

async function inspectTaskListTasks(
  taskListId: number,
  include = false,
): Promise<TaskListTasksEndpointReport> {
  const endpoint = `/tasklists/${taskListId}/tasks.json${include ? `?${INCLUDE_QUERY}` : ""}`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const tasks = getArray(root, "tasks").filter(isObject);

  return {
    endpoint,
    taskCount: tasks.length,
    taskKeys: tasks.map((task) => Object.keys(task).sort()),
    tasks: tasks.map(summarizeTask),
    included: summarizeIncluded(root),
  };
}

async function inspectTimers(): Promise<TimersEndpointReport> {
  const endpoint = `/me/timers.json`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const timers = getArray(root, "timers").filter(isObject);

  return {
    endpoint,
    timerCount: timers.length,
    timers: timers.map(summarizeTimer),
  };
}

async function inspectWorkflow(
  workflowId: number,
  include = false,
): Promise<WorkflowEndpointReport> {
  const endpoint = `/workflows/${workflowId}.json${include ? `?include=stages` : ""}`;
  const root = await fetchTeamworkApiJson(endpoint);
  if (!isObject(root)) throw new Error(`Unexpected Teamwork response for ${endpoint}.`);

  const workflow = getObject(root, "workflow");
  const included = getObject(root, "included");

  return {
    endpoint,
    workflow,
    includedStages: summarizeStages(included ? getObject(included, "stages") : null),
  };
}

const DEFAULT_WORKFLOW_IDS = [9] as const;

function parseIds(value: string | undefined, defaults: readonly number[]): number[] {
  if (!value?.trim()) return [...defaults];

  return value.split(",").map((rawId) => {
    const id = Number(rawId.trim());
    if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid Teamwork ID: ${rawId}`);
    return id;
  });
}

const taskIds = parseIds(Bun.env.WTC_TEAMWORK_INSPECT_TASK_IDS, DEFAULT_TASK_IDS);
const taskListIds = parseIds(Bun.env.WTC_TEAMWORK_INSPECT_TASK_LIST_IDS, DEFAULT_TASK_LIST_IDS);
const workflowIds = parseIds(Bun.env.WTC_TEAMWORK_INSPECT_WORKFLOW_IDS, DEFAULT_WORKFLOW_IDS);

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

const report = {
  timers: await inspectSafely("timers", () => inspectTimers()),
  workflows: await Promise.all(
    workflowIds.map((workflowId) =>
      inspectSafely(`workflow ${workflowId}`, () => inspectWorkflow(workflowId, true)),
    ),
  ),
  tasks: await Promise.all(
    taskIds.map((taskId) => inspectSafely(`task ${taskId}`, () => inspectTask(taskId))),
  ),
  tasksWithIncludes: await Promise.all(
    taskIds.map((taskId) =>
      inspectSafely(`task ${taskId} with includes`, () => inspectTask(taskId, true)),
    ),
  ),
  taskLists: await Promise.all(
    taskListIds.map((taskListId) =>
      inspectSafely(`task list ${taskListId}`, () => inspectTaskList(taskListId)),
    ),
  ),
  taskListsWithIncludes: await Promise.all(
    taskListIds.map((taskListId) =>
      inspectSafely(`task list ${taskListId} with includes`, () =>
        inspectTaskList(taskListId, true),
      ),
    ),
  ),
  taskListTasks: await Promise.all(
    taskListIds.map((taskListId) =>
      inspectSafely(`task list tasks ${taskListId}`, () => inspectTaskListTasks(taskListId)),
    ),
  ),
  taskListTasksWithIncludes: await Promise.all(
    taskListIds.map((taskListId) =>
      inspectSafely(`task list tasks ${taskListId} with includes`, () =>
        inspectTaskListTasks(taskListId, true),
      ),
    ),
  ),
};

console.log(JSON.stringify(report, null, 2));
