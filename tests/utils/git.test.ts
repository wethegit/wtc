import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { parseGitHubRemoteUrl, detectRepo, currentBranch, createBranch } =
  await import("../../src/utils/git.ts");

describe("parseGitHubRemoteUrl", () => {
  test("parses SSH remote URL", () => {
    expect(parseGitHubRemoteUrl("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  test("parses SSH remote URL without .git suffix", () => {
    expect(parseGitHubRemoteUrl("git@github.com:owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  test("parses HTTPS remote URL with .git suffix", () => {
    expect(parseGitHubRemoteUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  test("parses HTTPS remote URL without .git suffix", () => {
    expect(parseGitHubRemoteUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  test("rejects non-GitHub URL", () => {
    expect(parseGitHubRemoteUrl("https://gitlab.com/owner/repo.git")).toBeNull();
  });

  test("rejects malformed URL", () => {
    expect(parseGitHubRemoteUrl("not-a-url")).toBeNull();
  });

  test("rejects URL with extra path segments", () => {
    expect(parseGitHubRemoteUrl("https://github.com/owner/repo/extra")).toBeNull();
  });

  test("trims whitespace", () => {
    expect(parseGitHubRemoteUrl("  git@github.com:owner/repo.git  ")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });
});

describe("git shell commands", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "wtc-git-test-"));
    await Bun.$`git init --initial-branch=main`.cwd(tempDir);
    await Bun.$`git config user.name Test`.cwd(tempDir);
    await Bun.$`git config user.email test@test.com`.cwd(tempDir);
    // Create an initial commit so HEAD is valid
    await Bun.write(join(tempDir, "README.md"), "# test");
    await Bun.$`git add README.md`.cwd(tempDir);
    await Bun.$`git commit -m init`.cwd(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("detectRepo returns null when no remote is configured", async () => {
    const url = await detectRepo(tempDir);
    expect(url).toBeNull();
  });

  test("detectRepo returns remote URL when origin is set", async () => {
    await Bun.$`git remote add origin git@github.com:owner/repo.git`.cwd(tempDir);
    const url = await detectRepo(tempDir);
    expect(url).toBe("git@github.com:owner/repo.git");
  });

  test("currentBranch returns the current branch name", async () => {
    const branch = await currentBranch(tempDir);
    expect(branch).toBe("main");
  });

  test("createBranch creates and checks out a new branch", async () => {
    await createBranch("feature/test-branch", tempDir);
    const branch = await currentBranch(tempDir);
    expect(branch).toBe("feature/test-branch");
  });
});
