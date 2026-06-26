/** Factory for `mock.module("../../src/api/github/auth.ts", ...)`. */
export function mockGitHubAuthModule() {
  return {
    getGitHubApiToken: async () => "ghp_test-token",
    getGitHubAuthStatus: async () => "configured",
    setGitHubApiToken: async () => {},
    deleteGitHubApiToken: async () => true,
  };
}
