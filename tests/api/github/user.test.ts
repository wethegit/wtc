import { describe, expect, mock, test, beforeEach } from "bun:test";

import { mockGitHubAuthModule } from "../../helpers/github.ts";
import { useTempCacheDir } from "../../helpers/teamwork.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

// Stateful mock so tests can simulate network errors without replacing
// the module-level mock (which leaks to other test files).
let mockError: Error | null = null;

mock.module("../../../src/api/github/client.ts", () => ({
  getOctokit: async () => {
    if (mockError) throw mockError;
    return {
      rest: {
        users: {
          getAuthenticated: async () => ({
            data: {
              login: "testuser",
              name: "Test User",
              avatar_url: "https://example.com/avatar.png",
            },
          }),
        },
      },
    };
  },
}));

const { getGitHubCurrentUser } = await import("../../../src/api/github/user.ts");

describe("github current user", () => {
  useTempCacheDir();

  beforeEach(() => {
    mockError = null;
  });

  test("fetches current user with GitHub auth", async () => {
    const user = await getGitHubCurrentUser();

    expect(user).toEqual({
      login: "testuser",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  test("returns cached user without fetching", async () => {
    await getGitHubCurrentUser();
    const user = await getGitHubCurrentUser();
    expect(user.login).toBe("testuser");
  });

  test("falls back to stale cache on network error", async () => {
    await getGitHubCurrentUser();
    mockError = new Error("Network failure");
    const user = await getGitHubCurrentUser();
    expect(user.login).toBe("testuser");
    expect(user.name).toBe("Test User");
  });
});
