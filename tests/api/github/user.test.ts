import { describe, expect, mock, test } from "bun:test";

import { mockGitHubAuthModule, mockGitHubClientModule } from "../../helpers/github.ts";
import { useTempCacheDir } from "../../helpers/teamwork.ts";

mock.module("../../../src/api/github/auth.ts", () => ({
  ...mockGitHubAuthModule(),
}));

mock.module("../../../src/api/github/client.ts", () => ({
  ...mockGitHubClientModule(),
}));

const { getGitHubCurrentUser } = await import("../../../src/api/github/user.ts");

describe("github current user", () => {
  useTempCacheDir();

  test("fetches current user with GitHub auth", async () => {
    const user = await getGitHubCurrentUser();

    expect(user).toEqual({
      login: "testuser",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  test("returns cached user without fetching", async () => {
    const first = await getGitHubCurrentUser();
    expect(first.login).toBe("testuser");
    expect(first.name).toBe("Test User");

    const second = await getGitHubCurrentUser();
    expect(second.login).toBe("testuser");
    expect(second.name).toBe("Test User");
  });

  test("falls back to stale cache on network error", async () => {
    // Prime the cache with a successful fetch
    await getGitHubCurrentUser();

    // Replace the module mock so the next fetch throws
    mock.module("../../../src/api/github/client.ts", () => ({
      getOctokit: async () => {
        throw new Error("Network failure");
      },
    }));

    const { getGitHubCurrentUser: getStale } = await import("../../../src/api/github/user.ts");
    const user = await getStale();
    expect(user.login).toBe("testuser");
    expect(user.name).toBe("Test User");
  });
});
