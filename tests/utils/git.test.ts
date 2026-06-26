import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { parseGitHubRemoteUrl, detectRepo, currentBranch, createBranch, pushBranch, branchExists } =
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

  test("parses SSH remote URL in ssh:// form", () => {
    expect(parseGitHubRemoteUrl("ssh://git@github.com/owner/repo.git")).toEqual({
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

  test("parses HTTPS remote URL with trailing slash", () => {
    expect(parseGitHubRemoteUrl("https://github.com/owner/repo.git/")).toEqual({
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

  test("branchExists returns false for non-existent branch", async () => {
    expect(await branchExists("feature/nope", tempDir)).toBe(false);
  });

  test("branchExists returns true after branch is created", async () => {
    expect(await branchExists("feature/test-branch", tempDir)).toBe(false);
    await createBranch("feature/test-branch", tempDir);
    expect(await branchExists("feature/test-branch", tempDir)).toBe(true);
  });

  test("createBranch creates and checks out a new branch", async () => {
    await createBranch("feature/test-branch", tempDir);
    const branch = await currentBranch(tempDir);
    expect(branch).toBe("feature/test-branch");
  });

  test("pushBranch pushes to remote and sets upstream", async () => {
    const bareDir = mkdtempSync(join(tmpdir(), "wtc-git-bare-"));
    try {
      await Bun.$`git init --bare`.cwd(bareDir);
      await Bun.$`git remote add origin ${bareDir}`.cwd(tempDir);

      await createBranch("feature/push-test", tempDir);
      await pushBranch("feature/push-test", tempDir);

      const remoteBranches = (await Bun.$`git branch -r`.cwd(tempDir).text()).trim();
      expect(remoteBranches).toContain("origin/feature/push-test");
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });
});
