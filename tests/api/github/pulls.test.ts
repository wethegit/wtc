import { describe, expect, mock, test, afterAll, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { mockGitHubAuthModule } from "../../helpers/github.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

const capturedPullArgsByHead = new Map<string, Record<string, unknown>>();

mock.module("../../../src/api/github/client.ts", () => ({
  getOctokit: async () => ({
    rest: {
      repos: {
        get: async () => ({ data: { default_branch: "main" } }),
      },
      pulls: {
        create: async (args: Record<string, unknown>) => {
          const head = typeof args.head === "string" ? args.head : "";
          if (head) capturedPullArgsByHead.set(head, args);
          return {
            data: {
              html_url: "https://github.com/owner/repo/pull/42",
              number: 42,
            },
          };
        },
      },
    },
  }),
}));

const { createDraftPullRequest } = await import("../../../src/api/github/pulls.ts");

const BASE_INPUT = {
  owner: "owner",
  repo: "repo",
  branchName: "user/tw123",
  title: "feat: My task",
  task: { id: 123, name: "My task" },
};

let testBranchCounter = 0;

async function createDraftPullRequestAndCaptureArgs(
  input: Partial<typeof BASE_INPUT & { baseBranch?: string; reviewTask?: { id: number; name: string } | null }>,
  projectDir: string,
): Promise<{
  args: Record<string, unknown>;
  result: { url: string; number: number };
}> {
  testBranchCounter += 1;
  const branchName = `user/tw123-${testBranchCounter}`;

  const result = await createDraftPullRequest({
    ...BASE_INPUT,
    ...input,
    branchName,
    projectDir,
  });

  const args = capturedPullArgsByHead.get(branchName);
  if (!args) throw new Error(`Failed to capture pull request args for branch "${branchName}".`);
  capturedPullArgsByHead.delete(branchName);
  return { args, result };
}

describe("createDraftPullRequest", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "wtc-pr-test-"));
  });

  afterAll(() => {
    mock.restore();
  });

  test("creates draft PR with minimal input", async () => {
    const { args, result } = await createDraftPullRequestAndCaptureArgs({}, tempDir);

    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.number).toBe(42);

    expect(args.owner).toBe("owner");
    expect(args.repo).toBe("repo");
    expect(args.head).toContain("user/tw123-");
    expect(args.base).toBe("main");
    expect(args.title).toBe("feat: My task");
    expect(args.draft).toBe(true);
  });

  test("sets draft flag on PR", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    expect(args.draft).toBe(true);
  });

  test("uses baseBranch when provided", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs(
      {
        baseBranch: "develop",
      },
      tempDir,
    );
    expect(args.base).toBe("develop");
  });

  test("falls back to repo default branch when baseBranch is omitted", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    expect(args.base).toBe("main");
  });

  test("includes task reference in PR body", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("My task");
    expect(body).toContain("#123");
  });

  test("includes review task reference in PR body when provided", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs(
      {
        reviewTask: { id: 456, name: "General | Code review" },
      },
      tempDir,
    );
    const body = args.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("Code Review Task");
    expect(body).toContain("General | Code review");
    expect(body).toContain("#456");
  });

  test("omits review task from body when not provided", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).not.toContain("Code Review Task");
  });

  test("includes PR template content when .github/PULL_REQUEST_TEMPLATE.md exists", async () => {
    mkdirSync(join(tempDir, ".github"), { recursive: true });
    writeFileSync(
      join(tempDir, ".github/PULL_REQUEST_TEMPLATE.md"),
      "## Description\n\nPlease describe your changes.",
    );

    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("## Description");
    expect(body).toContain("Please describe your changes.");
  });

  test("includes PR template from docs/PULL_REQUEST_TEMPLATE.md", async () => {
    mkdirSync(join(tempDir, "docs"), { recursive: true });
    writeFileSync(join(tempDir, "docs/PULL_REQUEST_TEMPLATE.md"), "## Checklist");

    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("## Checklist");
  });

  test("includes PR template from root PULL_REQUEST_TEMPLATE.md", async () => {
    writeFileSync(join(tempDir, "PULL_REQUEST_TEMPLATE.md"), "## Root template");

    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("## Root template");
  });

  test("prioritises .github template over others", async () => {
    mkdirSync(join(tempDir, ".github"), { recursive: true });
    writeFileSync(join(tempDir, ".github/PULL_REQUEST_TEMPLATE.md"), "## From .github");
    writeFileSync(join(tempDir, "PULL_REQUEST_TEMPLATE.md"), "## From root");

    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("## From .github");
    expect(body).not.toContain("## From root");
  });

  test("creates clean body when no template exists", async () => {
    const { args } = await createDraftPullRequestAndCaptureArgs({}, tempDir);
    const body = args.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("null");
  });
});
