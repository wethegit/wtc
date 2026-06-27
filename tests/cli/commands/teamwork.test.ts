import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  formatTeamworkTaskListPinnedOutput,
  teamworkTaskListPin,
  teamworkTaskListPinned,
  teamworkTaskListUnpin,
  teamworkTaskOpen,
} from "../../../src/cli/commands/teamwork.ts";
import type { ProjectConfig, ResolvedConfig } from "../../../src/api/config/schema.ts";
import { TEAMWORK_BASE_URL } from "../../../src/api/teamwork/consts.ts";
import type { TeamworkTask } from "../../../src/api/teamwork/task-list-tasks.ts";
import type { MyWorkTask } from "../../../src/api/teamwork/my-tasks.ts";

const resolvedConfig: ResolvedConfig = {
  user: { version: 1, workspaceName: "WTC" },
  project: {
    version: 1,
    project: { links: [] },
    teamwork: {
      projectId: 362632,
      reviewTaskId: null,
      pinnedTaskLists: [{ name: "General Tasks", id: 1597639 }],
    },
  },
  paths: {
    userConfigPath: "/home/user/.config/wtc/wtc.yaml",
    projectConfigPath: "/repo/.wtc.yaml",
    projectConfigSearchStart: "/repo",
  },
};

const tasks: TeamworkTask[] = [
  {
    id: 1,
    name: "Dev | Code Review",
    status: "active",
    url: null,
    assignees: ["Marlon Bain"],
    dueDate: "2026-06-24",
    boardColumn: { name: "To Do", color: null },
    priority: "high",
  },
  {
    id: 2,
    name: "General | Meeting",
    status: null,
    url: null,
    assignees: [],
    dueDate: null,
    boardColumn: null,
    priority: null,
  },
];

const originalLog = console.log;
let logs: string[];

describe("teamwork command", () => {
  beforeEach(() => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("formats pinned task lists as text", () => {
    expect(
      formatTeamworkTaskListPinnedOutput(
        {
          projectConfigPath: "/repo/.wtc.yaml",
          taskLists: [{ id: 1597639, name: "General Tasks", tasks, error: null }],
        },
        { json: false },
      ),
    ).toBe(`Project config: /repo/.wtc.yaml
Pinned task lists:
General Tasks (1597639)
  - Dev | Code Review [active]
    assignee: Marlon Bain | due: 2026-06-24 | board: To Do | priority: high
  - General | Meeting`);
  });

  test("prints pinned task lists as JSON", async () => {
    await teamworkTaskListPinned(
      { json: true, startDir: "/repo" },
      {
        loadResolvedConfig: async () => resolvedConfig,
        getTeamworkTaskListTasks: async () => tasks,
      },
    );

    expect(JSON.parse(logs[0] ?? "")).toEqual({
      projectConfigPath: "/repo/.wtc.yaml",
      taskLists: [{ id: 1597639, name: "General Tasks", tasks, error: null }],
    });
  });

  test("prints empty state without project config", async () => {
    await teamworkTaskListPinned(
      { json: false, startDir: "/repo" },
      {
        loadResolvedConfig: async () => ({ ...resolvedConfig, project: null }),
        getTeamworkTaskListTasks: async () => tasks,
      },
    );

    expect(logs).toEqual([
      `Project config: /repo/.wtc.yaml
No pinned task lists configured.`,
    ]);
  });

  test("pins a task list in project config", async () => {
    const savedConfigs: ProjectConfig[] = [];

    await teamworkTaskListPin(
      { taskListId: 1597639, name: "General Tasks", startDir: "/repo" },
      {
        loadResolvedConfig: async () => ({ ...resolvedConfig, project: null }),
        saveProjectConfig: async (config) => {
          savedConfigs.push(config);
          return "/repo/.wtc.yaml";
        },
      },
    );

    expect(savedConfigs).toEqual([
      {
        version: 1,
        project: { links: [] },
        teamwork: {
          projectId: null,
          reviewTaskId: null,
          pinnedTaskLists: [{ id: 1597639, name: "General Tasks" }],
        },
      },
    ]);
    expect(logs).toEqual(["Pinned Teamwork task list: General Tasks (1597639) in /repo/.wtc.yaml"]);
  });

  test("updates an existing pinned task list name", async () => {
    const savedConfigs: ProjectConfig[] = [];

    await teamworkTaskListPin(
      { taskListId: 1597639, name: "Time Tracking", startDir: "/repo" },
      {
        loadResolvedConfig: async () => structuredClone(resolvedConfig),
        saveProjectConfig: async (config) => {
          savedConfigs.push(config);
          return "/repo/.wtc.yaml";
        },
      },
    );

    expect(savedConfigs[0]?.teamwork.pinnedTaskLists).toEqual([
      { id: 1597639, name: "Time Tracking" },
    ]);
  });

  test("unpins a task list from project config", async () => {
    const savedConfigs: ProjectConfig[] = [];

    await teamworkTaskListUnpin(
      { taskListId: 1597639, startDir: "/repo" },
      {
        loadResolvedConfig: async () => structuredClone(resolvedConfig),
        saveProjectConfig: async (config) => {
          savedConfigs.push(config);
          return "/repo/.wtc.yaml";
        },
      },
    );

    expect(savedConfigs[0]?.teamwork.pinnedTaskLists).toEqual([]);
    expect(logs).toEqual([
      "Unpinned Teamwork task list: General Tasks (1597639) from /repo/.wtc.yaml",
    ]);
  });

  test("unpin rejects missing pinned task list", async () => {
    try {
      await teamworkTaskListUnpin(
        { taskListId: 123, startDir: "/repo" },
        {
          loadResolvedConfig: async () => structuredClone(resolvedConfig),
          saveProjectConfig: async () => "/repo/.wtc.yaml",
        },
      );
      throw new Error("Expected teamworkTaskListUnpin to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Pinned Teamwork task list not found: 123"));
    }
  });

  test("opens a Teamwork task", async () => {
    const openedUrls: string[] = [];

    await teamworkTaskOpen(
      { task: "12345" },
      {
        openUrlInBrowser: async (url) => {
          openedUrls.push(url);
        },
      },
    );

    expect(openedUrls).toEqual([`${TEAMWORK_BASE_URL}/app/tasks/12345`]);
    expect(logs).toEqual([`Opened Teamwork task: ${TEAMWORK_BASE_URL}/app/tasks/12345`]);
  });
});

const alphaTask: MyWorkTask = {
  id: 1,
  name: "Dev | Code Review",
  status: "active",
  url: null,
  projectId: 5001,
  projectName: "Alpha Project",
  dueDate: "2026-06-24",
  assignees: ["Marlon Marcello"],
  priority: "high",
};

const betaTask: MyWorkTask = {
  id: 2,
  name: "General | Meeting",
  status: null,
  url: null,
  projectId: 5002,
  projectName: "Beta Project",
  dueDate: null,
  assignees: [],
  priority: null,
};

describe("teamwork task mine", () => {
  beforeEach(() => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("formats my tasks output as text", async () => {
    const { formatTeamworkTaskMineOutput } = await import("../../../src/cli/commands/teamwork.ts");

    const output = formatTeamworkTaskMineOutput(
      [
        {
          projectId: 5001,
          projectName: "Alpha Project",
          tasks: [alphaTask],
        },
        {
          projectId: 5002,
          projectName: "Beta Project",
          tasks: [betaTask],
        },
      ],
      { json: false },
    );

    expect(output).toBe(`Alpha Project:
  - Dev | Code Review [active]
    assignee: Marlon Marcello | due: 2026-06-24 | priority: high
Beta Project:
  - General | Meeting`);
  });

  test("formats my tasks output as JSON", async () => {
    const { formatTeamworkTaskMineOutput } = await import("../../../src/cli/commands/teamwork.ts");

    const groups = [
      {
        projectId: 5001,
        projectName: "Alpha Project",
        tasks: [alphaTask],
      },
    ];

    const output = formatTeamworkTaskMineOutput(groups, { json: true });
    expect(JSON.parse(output)).toEqual(groups);
  });

  test("formats empty output", async () => {
    const { formatTeamworkTaskMineOutput } = await import("../../../src/cli/commands/teamwork.ts");

    const output = formatTeamworkTaskMineOutput([], { json: false });
    expect(output).toBe("No tasks found for the next 7 days.");
  });

  test("prints my tasks using actions", async () => {
    const { teamworkTaskMine } = await import("../../../src/cli/commands/teamwork.ts");

    await teamworkTaskMine(
      { json: false },
      {
        getTeamworkCurrentUserId: async () => 238814,
        getTeamworkMyTasksGrouped: async () => [
          {
            projectId: 5001,
            projectName: "Alpha Project",
            tasks: [alphaTask],
          },
        ],
      },
    );

    expect(logs[0]).toContain("Alpha Project");
    expect(logs[0]).toContain("Dev | Code Review");
  });

  test("prints my tasks as JSON using actions", async () => {
    const { teamworkTaskMine } = await import("../../../src/cli/commands/teamwork.ts");

    await teamworkTaskMine(
      { json: true },
      {
        getTeamworkCurrentUserId: async () => 238814,
        getTeamworkMyTasksGrouped: async () => [
          {
            projectId: 5001,
            projectName: "Alpha Project",
            tasks: [alphaTask],
          },
        ],
      },
    );

    const parsed = JSON.parse(logs[0] ?? "");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.projectName).toBe("Alpha Project");
  });
});
