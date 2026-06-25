import { describe, expect, mock, test, afterEach } from "bun:test";

import {
  createMockFetch,
  mockTeamworkAuthModule,
  useTempCacheDir,
} from "../../helpers/teamwork.ts";
import { TEAMWORK_API_BASE_URL } from "../../../src/api/teamwork/consts.ts";

mock.module("../../../src/api/teamwork/auth.ts", mockTeamworkAuthModule);

const { createTeamworkAuthorizationHeader } = await import("../../../src/api/teamwork/auth.ts");
const { getTeamworkTaskListTasks, getPinnedTaskListTasks } =
  await import("../../../src/api/teamwork/task-list-tasks.ts");

const originalFetch = globalThis.fetch;

describe("teamwork task list tasks", () => {
  useTempCacheDir();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("gets tasks for a Teamwork task list", async () => {
    const requestedUrls: string[] = [];
    let authorization = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestedUrls.push(url);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";

      if (url.endsWith("/workflows/9.json?include=stages")) {
        return new Response(
          JSON.stringify({
            included: {
              stages: {
                "5": { id: 5, name: "Blocked", color: "#e40526" },
                "6": { id: 6, name: "To Do", color: "#8599f8" },
              },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          included: {
            users: {
              "7": { id: 7, firstName: "Alex", lastName: "Lee" },
              "8": { id: 8, firstName: "Sam", lastName: "Jones" },
              "9": { id: 9, firstName: "Marlon", lastName: "Bain" },
            },
          },
          tasks: [
            {
              id: "1",
              name: "Dev | Code Review",
              status: "active",
              assigneeUsers: [{ id: 9, type: "users" }],
              dueDate: "2026-06-24T00:00:00Z",
              workflowStages: [{ workflowId: 9, stageId: 6 }],
              priority: "high",
            },
            {
              id: 2,
              content: "General | Meeting",
              assigneeUsers: [{ id: 7, type: "users" }],
              assigneeUserIds: [8],
              dueDate: { date: "2026-06-25" },
              workflowStages: [{ workflowId: 9, stageId: 5 }],
              priority: { name: "medium" },
            },
            {
              id: 3,
              content: "General | Miscellaneous",
              status: null,
              assigneeUsers: null,
              assigneeUserIds: null,
              dueDate: null,
              column: null,
              priority: null,
              workflowStages: null,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const tasks = await getTeamworkTaskListTasks(1597639);

    expect(tasks).toEqual([
      {
        id: 1,
        name: "Dev | Code Review",
        status: "active",
        url: null,
        assignees: ["Marlon Bain"],
        dueDate: "2026-06-24",
        boardColumn: { name: "To Do", color: "#8599f8" },
        priority: "high",
      },
      {
        id: 2,
        name: "General | Meeting",
        status: null,
        url: null,
        assignees: ["Alex Lee", "Sam Jones"],
        dueDate: "2026-06-25",
        boardColumn: { name: "Blocked", color: "#e40526" },
        priority: "medium",
      },
      {
        id: 3,
        name: "General | Miscellaneous",
        status: null,
        url: null,
        assignees: [],
        dueDate: null,
        boardColumn: null,
        priority: null,
      },
    ]);
    expect(requestedUrls).toEqual([
      `${TEAMWORK_API_BASE_URL}/tasklists/1597639/tasks.json?include=users,assigneeUsers`,
      `${TEAMWORK_API_BASE_URL}/workflows/9.json?include=stages`,
    ]);
    expect(authorization).toBe(createTeamworkAuthorizationHeader("token-123"));
  });
});

describe("getPinnedTaskListTasks", () => {
  test("fetches all pinned task lists with error isolation", async () => {
    const actions = {
      getTeamworkTaskListTasks: async (id: number) => {
        if (id === 1)
          return [
            {
              id: 10,
              name: "Task A",
              status: null,
              url: null,
              assignees: [],
              dueDate: null,
              boardColumn: null,
              priority: null,
            },
          ];
        if (id === 2) return [];
        return [];
      },
    };

    const results = await getPinnedTaskListTasks(
      [
        { id: 1, name: "Active" },
        { id: 2, name: "Empty" },
      ],
      actions,
    );

    expect(results).toEqual([
      {
        id: 1,
        name: "Active",
        tasks: [
          {
            id: 10,
            name: "Task A",
            status: null,
            url: null,
            assignees: [],
            dueDate: null,
            boardColumn: null,
            priority: null,
          },
        ],
        error: null,
      },
      { id: 2, name: "Empty", tasks: [], error: null },
    ]);
  });

  test("isolates errors per list", async () => {
    const actions = {
      getTeamworkTaskListTasks: async (id: number) => {
        if (id === 1) throw new Error("Network error");
        return [
          {
            id: 20,
            name: "Task B",
            status: null,
            url: null,
            assignees: [],
            dueDate: null,
            boardColumn: null,
            priority: null,
          },
        ];
      },
    };

    const results = await getPinnedTaskListTasks(
      [
        { id: 1, name: "Failing" },
        { id: 2, name: "Working" },
      ],
      actions,
    );

    expect(results).toEqual([
      { id: 1, name: "Failing", tasks: [], error: "Network error" },
      {
        id: 2,
        name: "Working",
        tasks: [
          {
            id: 20,
            name: "Task B",
            status: null,
            url: null,
            assignees: [],
            dueDate: null,
            boardColumn: null,
            priority: null,
          },
        ],
        error: null,
      },
    ]);
  });

  test("returns empty array when no pinned task lists are configured", async () => {
    const actions = {
      getTeamworkTaskListTasks: async () => [],
    };

    const results = await getPinnedTaskListTasks([], actions);
    expect(results).toEqual([]);
  });
});
