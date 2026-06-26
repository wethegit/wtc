import { describe, expect, mock, test, afterAll, afterEach, beforeEach } from "bun:test";

import { mockGitHubAuthModule } from "../../helpers/github.ts";
import { useTempCacheDir } from "../../helpers/teamwork.ts";
import { getCacheDir } from "../../../src/api/cache/consts.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

// Stateful mock so tests can simulate network errors without replacing
// the module-level mock (which leaks to other test files).
let mockError: Error | null = null;
let mockGetOctokitCallCount = 0;

mock.module("../../../src/api/github/client.ts", () => ({
  getOctokit: async () => {
    mockGetOctokitCallCount++;
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
        pulls: {
          create: async () => ({}),
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
    mockGetOctokitCallCount = 0;
  });

  afterEach(() => {
    mockError = null;
    mockGetOctokitCallCount = 0;
  });

  afterAll(() => {
    mock.restore();
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
    expect(mockGetOctokitCallCount).toBe(1);

    const user = await getGitHubCurrentUser();
    expect(mockGetOctokitCallCount).toBe(1);
    expect(user.login).toBe("testuser");
  });

  test("falls back to stale cache on network error", async () => {
    await getGitHubCurrentUser();
    expect(mockGetOctokitCallCount).toBe(1);

    // Make the cache entry stale so the next call triggers a refetch
    const staleUser = {
      login: "testuser",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      cachedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    };
    await Bun.write(
      `${getCacheDir()}/github-user.json`,
      `${JSON.stringify({ version: 1, user: staleUser }, null, 2)}\n`,
    );

    mockError = new Error("Network failure");
    const user = await getGitHubCurrentUser();
    expect(mockGetOctokitCallCount).toBe(2);
    expect(user.login).toBe("testuser");
    expect(user.name).toBe("Test User");
  });
});
