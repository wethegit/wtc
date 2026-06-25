import { describe, expect, mock, test, afterEach } from "bun:test";

import {
  createMockFetch,
  mockTeamworkAuthModule,
  useTempCacheDir,
} from "../../helpers/teamwork.ts";
import { TEAMWORK_API_BASE_URL, TEAMWORK_BASE_URL } from "../../../src/api/teamwork/consts.ts";

mock.module("../../../src/api/teamwork/auth.ts", mockTeamworkAuthModule);

const { getTeamworkMyTasks, getTeamworkMyTasksGrouped } =
  await import("../../../src/api/teamwork/my-tasks.ts");

const originalFetch = globalThis.fetch;

const TASKS_RESPONSE = {
  tasks: [
    {
      id: 101,
      name: "Code Review",
      status: "new",
      tasklistId: 1001,
      assigneeUsers: [{ id: 238814, type: "users", name: "Marlon Marcello" }],
      assigneeUserIds: [238814],
      dueDate: "2026-06-24T00:00:00Z",
      priority: "high",
    },
    {
      id: 102,
      title: "Meeting Prep",
      status: "active",
      tasklistId: 1002,
      assigneeUsers: [
        { id: 238814, type: "users", name: "Marlon Marcello" },
        { id: 43327, type: "users", name: "Alex Lee" },
      ],
      assigneeUserIds: [238814, 43327],
      dueDate: { date: "2026-06-25" },
      priority: null,
    },
    {
      id: 103,
      content: "General Maintenance",
      status: null,
      tasklistId: 1001,
      assigneeUsers: null,
      assigneeUserIds: null,
      dueDate: null,
      priority: null,
    },
  ],
  included: {
    tasklists: {
      "1001": { id: 1001, name: "Development", projectId: 5001 },
      "1002": { id: 1002, name: "Meetings", projectId: 5002 },
    },
    projects: {
      "5001": { id: 5001, name: "WTC | Internal | General" },
      "5002": { id: 5002, name: "Alpha Project" },
    },
  },
};

describe("getTeamworkMyTasks", () => {
  useTempCacheDir();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches and parses my tasks", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = createMockFetch((url) => {
      requestedUrls.push(url);
      return new Response(JSON.stringify(TASKS_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const tasks = await getTeamworkMyTasks(238814);

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      id: 101,
      name: "Code Review",
      status: "new",
      projectId: 5001,
      projectName: "WTC | Internal | General",
      dueDate: "2026-06-24",
      assignees: ["Marlon Marcello"],
      priority: "high",
    });
    expect(tasks[1]).toMatchObject({
      id: 102,
      name: "Meeting Prep",
      status: "active",
      projectId: 5002,
      projectName: "Alpha Project",
      dueDate: "2026-06-25",
      assignees: ["Marlon Marcello", "Alex Lee"],
      priority: null,
    });
    expect(tasks[2]).toMatchObject({
      id: 103,
      name: "General Maintenance",
      status: null,
      projectId: 5001,
      projectName: "WTC | Internal | General",
      dueDate: null,
      assignees: [],
      priority: null,
    });

    expect(requestedUrls[0]).toBe(
      `${TEAMWORK_API_BASE_URL}/tasks.json?responsiblePartyIds=238814&includeTeamUserIds=true&taskFilter=within7&includeOverdueTasks=true&include=tasklists%2Cprojects`,
    );
  });

  test("returns empty array when no tasks", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(
        JSON.stringify({ tasks: [], included: { tasklists: {}, projects: {} } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const tasks = await getTeamworkMyTasks(238814);
    expect(tasks).toEqual([]);
  });

  test("handles missing included data gracefully", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(
        JSON.stringify({
          tasks: [{ id: 1, name: "Orphan Task", tasklistId: 9999 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const tasks = await getTeamworkMyTasks(238814);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 1,
      name: "Orphan Task",
      projectId: 0,
      projectName: "",
    });
  });

  test("generates url for tasks without one", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(
        JSON.stringify({
          tasks: [{ id: 42, name: "No URL Task", tasklistId: 1001 }],
          included: {
            tasklists: { "1001": { id: 1001, projectId: 5001 } },
            projects: { "5001": { id: 5001, name: "Test" } },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const tasks = await getTeamworkMyTasks(238814);
    expect(tasks[0]?.url).toBe(`${TEAMWORK_BASE_URL}/app/tasks/42`);
  });
});

describe("getTeamworkMyTasksGrouped", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("groups tasks alphabetically by project, sorted by due date", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(
        JSON.stringify({
          tasks: [
            { id: 1, name: "Task C", tasklistId: 1001, dueDate: "2026-06-27" },
            { id: 2, name: "Task B", tasklistId: 1001, dueDate: "2026-06-25" },
            { id: 3, name: "Task A", tasklistId: 1002, dueDate: "2026-06-24" },
            { id: 4, name: "Task D", tasklistId: 1002, dueDate: null },
          ],
          included: {
            tasklists: {
              "1001": { id: 1001, name: "Dev", projectId: 5001 },
              "1002": { id: 1002, name: "Meetings", projectId: 5002 },
            },
            projects: {
              "5001": { id: 5001, name: "Beta Project" },
              "5002": { id: 5002, name: "Alpha Project" },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const groups = await getTeamworkMyTasksGrouped(238814);

    // Alpha Project first (alphabetical), then Beta Project
    expect(groups).toHaveLength(2);
    expect(groups[0]?.projectName).toBe("Alpha Project");
    expect(groups[1]?.projectName).toBe("Beta Project");

    // Within Alpha Project: Task A (June 24) before Task D (null date)
    expect(groups[0]?.tasks.map((t) => t.name)).toEqual(["Task A", "Task D"]);

    // Within Beta Project: Task B (June 25) before Task C (June 27)
    expect(groups[1]?.tasks.map((t) => t.name)).toEqual(["Task B", "Task C"]);
  });

  test("returns empty array when no tasks", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(
        JSON.stringify({ tasks: [], included: { tasklists: {}, projects: {} } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const groups = await getTeamworkMyTasksGrouped(238814);
    expect(groups).toEqual([]);
  });
});
