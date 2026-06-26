import { describe, expect, test } from "bun:test";

import { getGitHubAuthStatus, type GitHubAuthStatus } from "../../../src/api/github/auth.ts";

describe("github auth", () => {
  test("exports GitHubAuthStatus type", () => {
    const status: GitHubAuthStatus = "missing";
    expect(status).toBe("missing");
    const configured: GitHubAuthStatus = "configured";
    expect(configured).toBe("configured");
  });

  test("getGitHubAuthStatus returns missing when no token stored", async () => {
    const result = await getGitHubAuthStatus();
    expect(result).toBe("missing");
  });
});
