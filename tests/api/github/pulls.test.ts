import { describe, expect, mock, test, afterAll, afterEach, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { mockGitHubAuthModule } from "../../helpers/github.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

let capturedPullArgs: Record<string, unknown> | null = null;

mock.module("../../../src/api/github/client.ts", () => ({
  getOctokit: async () => ({
    rest: {
      repos: {
        get: async () => ({ data: { default_branch: "main" } }),
      },
      pulls: {
        create: async (args: Record<string, unknown>) => {
          capturedPullArgs = args;
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

describe("createDraftPullRequest", () => {
  let tempDir: string;

  beforeEach(() => {
    capturedPullArgs = null;
    tempDir = mkdtempSync(join(tmpdir(), "wtc-pr-test-"));
  });

  afterEach(() => {
    capturedPullArgs = null;
  });

  afterAll(() => {
    mock.restore();
  });

  test("creates draft PR with minimal input", async () => {
    const result = await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.number).toBe(42);

    expect(capturedPullArgs?.owner).toBe("owner");
    expect(capturedPullArgs?.repo).toBe("repo");
    expect(capturedPullArgs?.head).toBe("user/tw123");
    expect(capturedPullArgs?.base).toBe("main");
    expect(capturedPullArgs?.title).toBe("feat: My task");
    expect(capturedPullArgs?.draft).toBe(true);
  });

  test("sets draft flag on PR", async () => {
    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });
    expect(capturedPullArgs?.draft).toBe(true);
  });

  test("uses baseBranch when provided", async () => {
    await createDraftPullRequest({
      ...BASE_INPUT,
      projectDir: tempDir,
      baseBranch: "develop",
    });
    expect(capturedPullArgs?.base).toBe("develop");
  });

  test("falls back to repo default branch when baseBranch is omitted", async () => {
    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });
    expect(capturedPullArgs?.base).toBe("main");
  });

  test("includes task reference in PR body", async () => {
    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("My task");
    expect(body).toContain("#123");
  });

  test("includes review task reference in PR body when provided", async () => {
    await createDraftPullRequest({
      ...BASE_INPUT,
      projectDir: tempDir,
      reviewTask: { id: 456, name: "General | Code review" },
    });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("Code Review Task");
    expect(body).toContain("General | Code review");
    expect(body).toContain("#456");
  });

  test("omits review task from body when not provided", async () => {
    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).not.toContain("Code Review Task");
  });

  test("includes PR template content when .github/PULL_REQUEST_TEMPLATE.md exists", async () => {
    mkdirSync(join(tempDir, ".github"), { recursive: true });
    writeFileSync(
      join(tempDir, ".github/PULL_REQUEST_TEMPLATE.md"),
      "## Description\n\nPlease describe your changes.",
    );

    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).toContain("## Description");
    expect(body).toContain("Please describe your changes.");
  });

  test("includes PR template from docs/PULL_REQUEST_TEMPLATE.md", async () => {
    mkdirSync(join(tempDir, "docs"), { recursive: true });
    writeFileSync(join(tempDir, "docs/PULL_REQUEST_TEMPLATE.md"), "## Checklist");

    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("## Checklist");
  });

  test("includes PR template from root PULL_REQUEST_TEMPLATE.md", async () => {
    writeFileSync(join(tempDir, "PULL_REQUEST_TEMPLATE.md"), "## Root template");

    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("## Root template");
  });

  test("prioritises .github template over others", async () => {
    mkdirSync(join(tempDir, ".github"), { recursive: true });
    writeFileSync(join(tempDir, ".github/PULL_REQUEST_TEMPLATE.md"), "## From .github");
    writeFileSync(join(tempDir, "PULL_REQUEST_TEMPLATE.md"), "## From root");

    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("## From .github");
    expect(body).not.toContain("## From root");
  });

  test("creates clean body when no template exists", async () => {
    await createDraftPullRequest({ ...BASE_INPUT, projectDir: tempDir });

    const body = capturedPullArgs?.body as string;
    expect(body).toContain("Teamwork Task");
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("null");
  });
});
