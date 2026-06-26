import { describe, expect, test } from "bun:test";

import { useTempCacheDir } from "../../helpers/teamwork.ts";

const { getTaskBranch, setTaskBranch, setTaskBranchPrUrl } =
  await import("../../../src/api/github/task-branches.ts");

const REPO_URL = "git@github.com:owner/repo.git";
const OTHER_REPO = "git@github.com:owner/other.git";

describe("task-branch cache", () => {
  useTempCacheDir();

  test("getTaskBranch returns null for unknown task", async () => {
    const entry = await getTaskBranch(REPO_URL, 999);
    expect(entry).toBeNull();
  });

  test("setTaskBranch and getTaskBranch round-trip", async () => {
    await setTaskBranch(REPO_URL, 123, "feature/test-branch");
    const entry = await getTaskBranch(REPO_URL, 123);

    expect(entry).toBeDefined();
    expect(entry?.branch).toBe("feature/test-branch");
    expect(entry?.createdAt).toBeGreaterThan(0);
  });

  test("setTaskBranchPrUrl updates existing entry", async () => {
    await setTaskBranch(REPO_URL, 456, "feature/another-branch");
    await setTaskBranchPrUrl(REPO_URL, 456, "https://github.com/owner/repo/pull/1");

    const entry = await getTaskBranch(REPO_URL, 456);
    expect(entry).toBeDefined();
    expect(entry?.branch).toBe("feature/another-branch");
    expect(entry?.prUrl).toBe("https://github.com/owner/repo/pull/1");
  });

  test("setTaskBranchPrUrl throws for unknown task", async () => {
    await expect(
      setTaskBranchPrUrl(REPO_URL, 999, "https://github.com/owner/repo/pull/1"),
    ).rejects.toThrow("No branch found for task 999 in repo git@github.com:owner/repo.git");
  });

  test("multiple repos are isolated", async () => {
    await setTaskBranch(REPO_URL, 1, "repo1-branch");
    await setTaskBranch(OTHER_REPO, 1, "repo2-branch");

    const entry1 = await getTaskBranch(REPO_URL, 1);
    const entry2 = await getTaskBranch(OTHER_REPO, 1);

    expect(entry1).toBeDefined();
    expect(entry2).toBeDefined();
    expect(entry1?.branch).toBe("repo1-branch");
    expect(entry2?.branch).toBe("repo2-branch");
  });
});
