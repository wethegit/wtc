import { describe, expect, mock, test, afterEach } from "bun:test";

import {
  createMockFetch,
  mockTeamworkAuthModule,
  useTempCacheDir,
} from "../../helpers/teamwork.ts";
import { TEAMWORK_API_BASE_URL } from "../../../src/api/teamwork/consts.ts";

mock.module("../../../src/api/teamwork/auth.ts", mockTeamworkAuthModule);

const { createTeamworkAuthorizationHeader } = await import("../../../src/api/teamwork/auth.ts");
const { getTeamworkProjectMetadata } =
  await import("../../../src/api/teamwork/project-metadata.ts");

const originalFetch = globalThis.fetch;

describe("teamwork project metadata", () => {
  useTempCacheDir();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("gets project metadata with Teamwork auth", async () => {
    let requestedUrl = "";
    let authorization = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestedUrl = url;
      authorization = new Headers(init?.headers).get("Authorization") ?? "";

      return new Response(JSON.stringify({ project: { id: "12345", name: "Website Redesign" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
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

    globalThis.fetch = createMockFetch(() => {
      fetchCount += 1;

      return new Response(JSON.stringify({ project: { id: 12345, name: "Website Redesign" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
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
