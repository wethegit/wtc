import { describe, expect, mock, test } from "bun:test";

import { mockGitHubAuthModule } from "../../helpers/github.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

const { getOctokit } = await import("../../../src/api/github/client.ts");

describe("github client", () => {
  test("getOctokit returns an authenticated Octokit instance", async () => {
    const octokit = await getOctokit();
    expect(octokit).toBeDefined();
    expect(typeof octokit.rest.pulls.create).toBe("function");
  });
});
