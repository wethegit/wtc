import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { rm } from "node:fs/promises";

mock.module("../../src/teamwork/auth.ts", () => ({
  createTeamworkAuthorizationHeader(token: string) {
    return `Basic ${btoa(`${token}:password`)}`;
  },
  deleteTeamworkApiToken: async () => true,
  getTeamworkApiToken: async () => "token-123",
  getTeamworkAuthStatus: async () => "configured",
  setTeamworkApiToken: async () => {},
}));

const { createTeamworkAuthorizationHeader } = await import("../../src/teamwork/auth.ts");
const { getTeamworkProjectMetadata } = await import("../../src/teamwork/project-metadata.ts");
import { TEAMWORK_API_BASE_URL } from "../../src/teamwork/consts.ts";

const TEST_CACHE = `/tmp/wtc-teamwork-project-tests-${process.pid}`;
const originalFetch = globalThis.fetch;

describe("teamwork project metadata", () => {
  beforeEach(() => {
    process.env.WTC_CACHE_DIR = TEST_CACHE;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    delete process.env.WTC_CACHE_DIR;
    await rm(TEST_CACHE, { recursive: true, force: true });
  });

  test("gets project metadata with Teamwork auth", async () => {
    let requestedUrl = "";
    let authorization = "";

    globalThis.fetch = Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        requestedUrl = input instanceof Request ? input.url : String(input);
        authorization = new Headers(init?.headers).get("Authorization") ?? "";

        return new Response(
          JSON.stringify({ project: { id: "12345", name: "Website Redesign" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
      { preconnect: originalFetch.preconnect },
    );
    const result = await getTeamworkProjectMetadata(12345);

    expect(result).toEqual({
      project: { id: 12345, name: "Website Redesign" },
      source: "network",
    });
    expect(requestedUrl).toBe(`${TEAMWORK_API_BASE_URL}/projects/12345.json`);
    expect(authorization).toBe(createTeamworkAuthorizationHeader("token-123"));
  });

  test("returns fresh cached project metadata without fetching", async () => {
    let fetchCount = 0;

    globalThis.fetch = Object.assign(
      async () => {
        fetchCount += 1;

        return new Response(JSON.stringify({ project: { id: 12345, name: "Website Redesign" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      { preconnect: originalFetch.preconnect },
    );
    const first = await getTeamworkProjectMetadata(12345);
    const second = await getTeamworkProjectMetadata(12345);

    expect(first).toEqual({
      project: { id: 12345, name: "Website Redesign" },
      source: "network",
    });
    expect(second).toEqual({
      project: { id: 12345, name: "Website Redesign" },
      source: "cache",
    });
    expect(fetchCount).toBe(1);
  });
});
