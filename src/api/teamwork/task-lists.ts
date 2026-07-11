import { z } from "zod";

import { logError } from "../logs/manager.ts";

import { fetchTeamworkApiJson } from "./client.ts";

export const TEAMWORK_GENERAL_TASK_LIST_NAME = "Internal | Billable Projects | General Tasks";
export const TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME = "General Tasks";

const TEAMWORK_CODE_REVIEW_TASK_SEARCH_TERM = "Dev | Code Review";
const TEAMWORK_CODE_REVIEW_TASK_NAMES = ["Dev | Code Review - Forever", "Dev | Code Review"];

const TeamworkIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform(Number),
]);

const TeamworkRelationshipSchema = z.looseObject({
  id: TeamworkIdSchema.optional(),
});

const TeamworkTaskListApiSchema = z.looseObject({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  title: z.string().optional(),
  projectId: TeamworkIdSchema.optional(),
  project: TeamworkRelationshipSchema.nullish(),
});

const TeamworkProjectTaskListsResponseSchema = z.looseObject({
  tasklists: z.array(TeamworkTaskListApiSchema).optional(),
  taskLists: z.array(TeamworkTaskListApiSchema).optional(),
});

const TeamworkTaskApiSchema = z.looseObject({
  id: TeamworkIdSchema,
  name: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  tasklistId: TeamworkIdSchema.optional(),
  tasklist: TeamworkRelationshipSchema.nullish(),
});

const TeamworkTasksResponseSchema = z.looseObject({
  tasks: z.array(TeamworkTaskApiSchema),
});

export interface TeamworkTaskList {
  id: number;
  name: string;
  projectId: number | null;
}

export interface TeamworkProjectBootstrapDefaults {
  generalTaskList: TeamworkTaskList | null;
  codeReviewTask: TeamworkTaskListTaskSummary | null;
}

export interface TeamworkTaskListTaskSummary {
  id: number;
  name: string;
  taskListId: number | null;
}

export async function getTeamworkProjectTaskListByName(
  projectId: number,
  name: string,
): Promise<TeamworkTaskList | null> {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Teamwork project ID must be a positive integer.");
  }
  const searchTerm = name.trim();
  if (!searchTerm) throw new Error("Teamwork task-list search term is required.");

  try {
    const searchParams = new URLSearchParams({
      searchTerm,
      page: "1",
      pageSize: "10",
      skipCounts: "true",
      "fields[tasklists]": "id,name,projectId",
    });
    const parsed = TeamworkProjectTaskListsResponseSchema.parse(
      await fetchTeamworkApiJson(`/projects/${projectId}/tasklists.json?${searchParams}`),
    );

    for (const taskList of parsed.tasklists ?? parsed.taskLists ?? []) {
      const taskListName = taskList.name ?? taskList.title;
      if (!taskListName) throw new Error("Teamwork task-list response did not include a name.");
      if (taskListName !== searchTerm) continue;

      return {
        id: taskList.id,
        name: taskListName,
        projectId: taskList.projectId ?? taskList.project?.id ?? null,
      };
    }

    return null;
  } catch (error) {
    logError("teamwork", "taskLists.project.search.error", "Failed to search project task lists", {
      projectId,
      searchTerm,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getTeamworkTaskInTaskListByNames(input: {
  projectId: number;
  taskListId: number;
  searchTerm: string;
  names: readonly string[];
}): Promise<TeamworkTaskListTaskSummary | null> {
  const searchTerm = input.searchTerm.trim();
  const names = input.names.map((name) => name.trim()).filter(Boolean);
  if (!Number.isInteger(input.projectId) || input.projectId <= 0) {
    throw new Error("Teamwork project ID must be a positive integer.");
  }
  if (!Number.isInteger(input.taskListId) || input.taskListId <= 0) {
    throw new Error("Teamwork task-list ID must be a positive integer.");
  }
  if (!searchTerm) throw new Error("Teamwork task search term is required.");
  if (names.length === 0) throw new Error("Teamwork task names are required.");

  try {
    const searchParams = new URLSearchParams({
      searchTerm,
      projectIds: input.projectId.toString(),
      tasklistIds: input.taskListId.toString(),
      taskFilter: "all",
      page: "1",
      pageSize: "10",
      skipCounts: "true",
      "fields[tasks]": "id,name,tasklistId,status",
    });
    const parsed = TeamworkTasksResponseSchema.parse(
      await fetchTeamworkApiJson(`/tasks.json?${searchParams}`),
    );

    const candidates: TeamworkTaskListTaskSummary[] = [];
    for (const task of parsed.tasks) {
      const name = task.name ?? task.title ?? task.content;
      if (!name) throw new Error("Teamwork task response did not include a name.");
      const taskListId = task.tasklistId ?? task.tasklist?.id ?? null;
      if (!names.includes(name) || taskListId !== input.taskListId) continue;
      candidates.push({ id: task.id, name, taskListId });
    }

    for (const name of names) {
      const candidate = candidates.find((task) => task.name === name);
      if (candidate) return candidate;
    }

    return null;
  } catch (error) {
    logError("teamwork", "taskList.task.search.error", "Failed to search task-list tasks", {
      projectId: input.projectId,
      taskListId: input.taskListId,
      searchTerm,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getTeamworkCodeReviewTaskInTaskList(input: {
  projectId: number;
  taskListId: number;
}): Promise<TeamworkTaskListTaskSummary | null> {
  return await getTeamworkTaskInTaskListByNames({
    projectId: input.projectId,
    taskListId: input.taskListId,
    searchTerm: TEAMWORK_CODE_REVIEW_TASK_SEARCH_TERM,
    names: TEAMWORK_CODE_REVIEW_TASK_NAMES,
  });
}

export async function getTeamworkProjectBootstrapDefaults(
  projectId: number,
): Promise<TeamworkProjectBootstrapDefaults> {
  const generalTaskList = await getTeamworkProjectTaskListByName(
    projectId,
    TEAMWORK_GENERAL_TASK_LIST_NAME,
  );
  if (!generalTaskList) return { generalTaskList: null, codeReviewTask: null };

  const codeReviewTask = await getTeamworkCodeReviewTaskInTaskList({
    projectId,
    taskListId: generalTaskList.id,
  });
  return { generalTaskList, codeReviewTask };
}
