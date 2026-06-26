/** Factory for mocking `src/api/github/auth.ts` via `mock.module(...)`. */
export function mockGitHubAuthModule() {
  return {
    getGitHubApiToken: async () => "ghp_test-token",
    getGitHubAuthStatus: async () => "configured",
    setGitHubApiToken: async () => {},
    deleteGitHubApiToken: async () => true,
  };
}
