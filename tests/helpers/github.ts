/** Factory for `mock.module("../../src/api/github/auth.ts", ...)`. */
export function mockGitHubAuthModule() {
  return {
    getGitHubApiToken: async () => "ghp_test-token",
    getGitHubAuthStatus: async () => "configured",
    setGitHubApiToken: async () => {},
    deleteGitHubApiToken: async () => true,
  };
}

/** Factory for `mock.module("../../src/api/github/client.ts", ...)`. */
export function mockGitHubClientModule() {
  return {
    getOctokit: async () => ({
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
        repos: {
          get: async () => ({
            data: { default_branch: "main" },
          }),
        },
      },
    }),
  };
}
