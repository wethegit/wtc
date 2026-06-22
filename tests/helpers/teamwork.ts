import { afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Factory for `mock.module("../../src/teamwork/auth.ts", ...)`. */
export function mockTeamworkAuthModule() {
  return {
    createTeamworkAuthorizationHeader(token: string) {
      return `Basic ${btoa(`${token}:password`)}`;
    },
    deleteTeamworkApiToken: async () => true,
    getTeamworkApiToken: async () => "token-123",
    getTeamworkAuthStatus: async () => "configured",
    setTeamworkApiToken: async () => {},
  };
}

/** Wraps a URL + headers-aware handler into a `globalThis.fetch`-compatible mock. */
export function createMockFetch(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
) {
  return Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return handler(url, init);
    },
    { preconnect: undefined },
  ) as unknown as typeof fetch;
}

/** Sets `WTC_CACHE_DIR` to a temp directory before each test and cleans up after. */
export function useTempCacheDir() {
  let tempCacheDir: string;
  const originalCacheDir = process.env.WTC_CACHE_DIR;

  beforeEach(() => {
    tempCacheDir = mkdtempSync(join(tmpdir(), "wtc-test-"));
    process.env.WTC_CACHE_DIR = tempCacheDir;
  });

  afterEach(() => {
    if (originalCacheDir === undefined) {
      delete process.env.WTC_CACHE_DIR;
    } else {
      process.env.WTC_CACHE_DIR = originalCacheDir;
    }
    rmSync(tempCacheDir, { recursive: true, force: true });
  });
}
