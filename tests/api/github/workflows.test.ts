import { beforeEach, describe, expect, mock, test } from "bun:test";

// Mutable flags for mock behavior
let branchExistsResult = false;
let savedTaskBranch: { repoKey: string; taskId: number; branch: string } | null = null;
let savedPrUrl: { repoKey: string; taskId: number; url: string } | null = null;
let savedProjectConfigRecord: Record<string, unknown> | null = null;
let calledCreateBranch = false;
let calledPushBranch = false;

mock.module("../../../src/utils/git.ts", () => ({
  branchExists: async (_name: string, _dir?: string) => branchExistsResult,
  createBranch: async (_name: string, _dir?: string) => {
    calledCreateBranch = true;
  },
  pushBranch: async (_name: string, _dir?: string) => {
    calledPushBranch = true;
  },
}));

mock.module("../../../src/api/github/task-branches.ts", () => ({
  setTaskBranch: async (repoKey: string, taskId: number, branch: string) => {
    savedTaskBranch = { repoKey, taskId, branch };
  },
  setTaskBranchPrUrl: async (repoKey: string, taskId: number, url: string) => {
    savedPrUrl = { repoKey, taskId, url };
  },
}));

mock.module("../../../src/api/github/pulls.ts", () => ({
  createDraftPullRequest: async (_input: {
    owner: string;
    repo: string;
    branchName: string;
    title: string;
    task: { id: number; name: string };
    baseBranch?: string;
    reviewTask?: { id: number; name: string } | null;
    projectDir?: string;
  }) => ({
    url: "https://github.com/owner/repo/pull/42",
    number: 42,
  }),
}));

mock.module("../../../src/api/config/manager.ts", () => ({
  loadProjectConfig: async (_dir: string) => null,
  saveProjectConfig: async (config: Record<string, unknown>, _dir: string) => {
    savedProjectConfigRecord = config;
    return "/repo/.wtc.yaml";
  },
}));

import { writeTaskBranch, writeTaskPr } from "../../../src/api/github/workflows.ts";

describe("writeTaskBranch", () => {
  beforeEach(() => {
    branchExistsResult = false;
    savedTaskBranch = null;
    calledCreateBranch = false;
    calledPushBranch = false;
  });

  test("creates branch, pushes, and caches mapping", async () => {
    await writeTaskBranch({
      taskId: 12345,
      branchName: "user/tw12345",
      repoKey: "owner/repo",
    });

    expect(calledCreateBranch).toBe(true);
    expect(calledPushBranch).toBe(true);
    expect(savedTaskBranch).toEqual({
      repoKey: "owner/repo",
      taskId: 12345,
      branch: "user/tw12345",
    });
  });

  test("throws when branch already exists", async () => {
    branchExistsResult = true;

    try {
      await writeTaskBranch({
        taskId: 12345,
        branchName: "user/tw12345",
        repoKey: "owner/repo",
      });
      throw new Error("Expected writeTaskBranch to reject.");
    } catch (error) {
      expect(error).toEqual(new Error('Branch "user/tw12345" already exists.'));
      expect(calledCreateBranch).toBe(false);
    }
  });
});

describe("writeTaskPr", () => {
  beforeEach(() => {
    savedPrUrl = null;
    savedProjectConfigRecord = null;
  });

  test("creates draft PR and caches PR URL", async () => {
    const result = await writeTaskPr({
      owner: "owner",
      repo: "repo",
      branchName: "user/tw12345",
      title: "feat: Test Task",
      task: { id: 12345, name: "Test Task" },
      baseBranch: "main",
      repoKey: "owner/repo",
      taskId: 12345,
    });

    expect(result).toEqual({
      url: "https://github.com/owner/repo/pull/42",
      number: 42,
    });
    expect(savedPrUrl).toEqual({
      repoKey: "owner/repo",
      taskId: 12345,
      url: "https://github.com/owner/repo/pull/42",
    });
  });

  test("saves reviewTaskId to project config when reviewTask is provided", async () => {
    savedProjectConfigRecord = null;

    await writeTaskPr({
      owner: "owner",
      repo: "repo",
      branchName: "user/tw12345",
      title: "feat: Test Task",
      task: { id: 12345, name: "Test Task" },
      baseBranch: "main",
      reviewTask: { id: 999, name: "Review Changes" },
      repoKey: "owner/repo",
      taskId: 12345,
    });

    expect(savedProjectConfigRecord).toBeTruthy();
    const config = savedProjectConfigRecord as unknown as Record<string, unknown>;
    expect(config.teamwork).toBeDefined();
    expect((config.teamwork as Record<string, unknown>).reviewTaskId).toBe(999);
  });

  test("does not save project config when reviewTask is omitted", async () => {
    await writeTaskPr({
      owner: "owner",
      repo: "repo",
      branchName: "user/tw12345",
      title: "feat: Test Task",
      task: { id: 12345, name: "Test Task" },
      baseBranch: "main",
      repoKey: "owner/repo",
      taskId: 12345,
    });

    expect(savedProjectConfigRecord).toBeNull();
  });

  test("passes projectDir through", async () => {
    await writeTaskPr({
      owner: "owner",
      repo: "repo",
      branchName: "user/tw12345",
      title: "feat: Test Task",
      task: { id: 12345, name: "Test Task" },
      baseBranch: "main",
      repoKey: "owner/repo",
      taskId: 12345,
      projectDir: "/custom/dir",
    });

    expect(savedPrUrl).not.toBeNull();
  });
});
