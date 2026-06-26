import { describe, expect, test } from "bun:test";

import type { GitHubAuthStatus } from "../../../src/api/github/auth.ts";

describe("github auth", () => {
  test("exports GitHubAuthStatus type", () => {
    const status: GitHubAuthStatus = "missing";
    expect(status).toBe("missing");
    const configured: GitHubAuthStatus = "configured";
    expect(configured).toBe("configured");
  });
});
