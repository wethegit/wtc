import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { TEAMWORK_BASE_URL } from "../../../src/api/teamwork/consts.ts";
import type { GitHubRemote } from "../../../src/utils/git.ts";

const originalLog = console.log;
let logs: string[];

import { teamworkTaskBranch, teamworkTaskPr } from "../../../src/cli/commands/task-workflow.ts";

describe("teamworkTaskBranch", () => {
  beforeEach(() => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  const defaultActions = {
    getTeamworkTaskReference: (value: string) => ({
      id: 12345,
      url: `${TEAMWORK_BASE_URL}/app/tasks/${value}`,
    }),
    getTeamworkTaskById: async (id: number) => ({ id, name: "Test Task" }),
    getGitHubCurrentUser: async () => ({ login: "testuser" }),
    detectRepo: async () => "git@github.com:owner/repo.git",
    parseGitHubRemoteUrl: (url: string): GitHubRemote | null => {
      if (url === "git@github.com:owner/repo.git") return { owner: "owner", repo: "repo" };
      return null;
    },
    startLocalTimer: async (_taskId: number, _taskName: string) => ({
      timer: {
        id: "timer-1",
        taskId: _taskId,
        taskName: _taskName,
        startTime: new Date().toISOString(),
        endTime: null,
        status: "running" as const,
      },
      stoppedPrevious: false,
    }),
    writeTaskBranch: async () => {},
  };

  test("creates a branch with default name", async () => {
    const calls: Array<{
      taskId: number;
      branchName: string;
      repoKey: string;
      projectDir?: string;
    }> = [];

    await teamworkTaskBranch(
      { task: "12345" },
      {
        ...defaultActions,
        writeTaskBranch: async (input) => {
          calls.push(input);
        },
      },
    );

    expect(calls).toEqual([
      {
        taskId: 12345,
        branchName: "testuser/tw12345",
        repoKey: "owner/repo",
        projectDir: undefined,
      },
    ]);
    expect(logs).toEqual(['Branch "testuser/tw12345" created for task: Test Task']);
  });

  test("uses custom name when provided", async () => {
    let usedName = "";

    await teamworkTaskBranch(
      { task: "12345", name: "custom-branch" },
      {
        ...defaultActions,
        writeTaskBranch: async (input) => {
          usedName = input.branchName;
        },
      },
    );

    expect(usedName).toBe("custom-branch");
    expect(logs).toEqual(['Branch "custom-branch" created for task: Test Task']);
  });

  test("reports when branch already exists", async () => {
    await teamworkTaskBranch(
      { task: "12345", name: "existing-branch" },
      {
        ...defaultActions,
        writeTaskBranch: async () => {
          throw new Error('Branch "existing-branch" already exists.');
        },
      },
    );

    expect(logs).toEqual(['Branch "existing-branch" already exists.']);
  });

  test("prints JSON output when --json is set", async () => {
    await teamworkTaskBranch({ task: "12345", json: true }, defaultActions);

    const parsed = JSON.parse(logs[0] ?? "");
    expect(parsed).toEqual({
      taskId: 12345,
      taskName: "Test Task",
      branch: "testuser/tw12345",
    });
  });

  test("starts timer when --start-timer is set", async () => {
    let timerStarted = false;

    await teamworkTaskBranch(
      { task: "12345", startTimer: true },
      {
        ...defaultActions,
        startLocalTimer: async (taskId, taskName) => {
          timerStarted = true;
          expect(taskId).toBe(12345);
          expect(taskName).toBe("Test Task");
          return {
            timer: {
              id: "timer-1",
              taskId,
              taskName,
              startTime: new Date().toISOString(),
              endTime: null,
              status: "running" as const,
            },
            stoppedPrevious: false,
          };
        },
      },
    );

    expect(timerStarted).toBe(true);
  });

  test("throws when not in a git repo", async () => {
    try {
      await teamworkTaskBranch(
        { task: "12345" },
        { ...defaultActions, detectRepo: async () => null },
      );
      throw new Error("Expected teamworkTaskBranch to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Not in a git repo with a GitHub remote."));
    }
  });

  test("rejects invalid task reference", async () => {
    try {
      await teamworkTaskBranch(
        { task: "" },
        {
          ...defaultActions,
          getTeamworkTaskReference: () => {
            throw new Error("Teamwork task ID or URL is required.");
          },
        },
      );
      throw new Error("Expected teamworkTaskBranch to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Teamwork task ID or URL is required."));
    }
  });
});

describe("teamworkTaskPr", () => {
  beforeEach(() => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  const defaultActions = {
    getTeamworkTaskReference: (value: string) => ({
      id: 12345,
      url: `${TEAMWORK_BASE_URL}/app/tasks/${value}`,
    }),
    getTeamworkTaskById: async (id: number) => ({ id, name: "Test Task" }),
    detectRepo: async () => "git@github.com:owner/repo.git",
    parseGitHubRemoteUrl: (url: string): GitHubRemote | null => {
      if (url === "git@github.com:owner/repo.git") return { owner: "owner", repo: "repo" };
      return null;
    },
    getTaskBranch: async () => ({ branch: "testuser/tw12345", createdAt: Date.now() }),
    currentBranch: async () => "current-branch",
    getRepoBranchInfo: async () => ({
      branches: [{ name: "main", default: true }],
      defaultBranch: "main",
    }),
    loadProjectConfig: async () => null,
    writeTaskPr: async () => ({ url: "https://github.com/owner/repo/pull/1", number: 1 }),
  };

  test("creates a draft PR with cached branch", async () => {
    const calls: Array<{ branchName: string; reviewTask?: unknown }> = [];

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        writeTaskPr: async (input) => {
          calls.push({ branchName: input.branchName, reviewTask: input.reviewTask });
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.branchName).toBe("testuser/tw12345");
    expect(calls[0]?.reviewTask).toBeUndefined();
    expect(logs).toEqual(["Draft PR #1 created: https://github.com/owner/repo/pull/1"]);
  });

  test("uses current branch when no cached branch exists", async () => {
    let usedBranch = "";

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        getTaskBranch: async () => null,
        writeTaskPr: async (input) => {
          usedBranch = input.branchName;
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(usedBranch).toBe("current-branch");
  });

  test("passes baseBranch to writeTaskPr when --target is provided", async () => {
    let usedBase = "";

    await teamworkTaskPr(
      { task: "12345", target: "develop" },
      {
        ...defaultActions,
        writeTaskPr: async (input) => {
          usedBase = input.baseBranch ?? "";
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(usedBase).toBe("develop");
  });

  test("passes default branch to writeTaskPr when --target is omitted", async () => {
    let usedBase = "";

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        writeTaskPr: async (input) => {
          usedBase = input.baseBranch ?? "";
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(usedBase).toBe("main");
  });

  test("falls back to main when branch detection fails", async () => {
    let usedBase = "";

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        getRepoBranchInfo: async () => {
          throw new Error("fetch failed");
        },
        writeTaskPr: async (input) => {
          usedBase = input.baseBranch ?? "";
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(usedBase).toBe("main");
  });

  test("passes review task from project config to writeTaskPr", async () => {
    let passedReview: unknown;

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        loadProjectConfig: async () => ({
          version: 1,
          project: { links: [] },
          teamwork: { projectId: null, reviewTaskId: 999, pinnedTaskLists: [] },
        }),
        getTeamworkTaskById: async (id: number) => {
          if (id === 999) return { id: 999, name: "Review Changes" };
          return { id: 12345, name: "Test Task" };
        },
        writeTaskPr: async (input) => {
          passedReview = input.reviewTask;
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(passedReview).toEqual({ id: 999, name: "Review Changes" });
  });

  test("handles stale review task in config gracefully", async () => {
    const getTeamworkTaskByIdCalls: number[] = [];

    await teamworkTaskPr(
      { task: "12345" },
      {
        ...defaultActions,
        loadProjectConfig: async () => ({
          version: 1,
          project: { links: [] },
          teamwork: { projectId: null, reviewTaskId: 999, pinnedTaskLists: [] },
        }),
        getTeamworkTaskById: async (id: number) => {
          getTeamworkTaskByIdCalls.push(id);
          if (id === 999) throw new Error("Task not found");
          return { id: 12345, name: "Test Task" };
        },
        writeTaskPr: async (input) => {
          expect(input.reviewTask).toBeUndefined();
          return { url: "https://github.com/owner/repo/pull/1", number: 1 };
        },
      },
    );

    expect(getTeamworkTaskByIdCalls).toContain(999);
    expect(logs).toEqual(["Draft PR #1 created: https://github.com/owner/repo/pull/1"]);
  });

  test("prints JSON output when --json is set", async () => {
    await teamworkTaskPr({ task: "12345", json: true }, defaultActions);

    const parsed = JSON.parse(logs[0] ?? "");
    expect(parsed).toEqual({
      taskId: 12345,
      taskName: "Test Task",
      prUrl: "https://github.com/owner/repo/pull/1",
      prNumber: 1,
    });
  });

  test("throws when not in a git repo", async () => {
    try {
      await teamworkTaskPr({ task: "12345" }, { ...defaultActions, detectRepo: async () => null });
      throw new Error("Expected teamworkTaskPr to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Not in a git repo with a GitHub remote."));
    }
  });
});
