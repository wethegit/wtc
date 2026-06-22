import { afterEach, describe, expect, mock, test } from "bun:test";

import { createMockFetch, mockTeamworkAuthModule, useTempCacheDir } from "../helpers/teamwork.ts";
import { getCacheDir } from "../../src/state/consts.ts";

mock.module("../../src/teamwork/auth.ts", mockTeamworkAuthModule);

const { getWorkflowStageNames } = await import("../../src/teamwork/workflow-stages.ts");

const originalFetch = globalThis.fetch;

describe("teamwork workflow stages", () => {
  useTempCacheDir();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns fresh cached workflow stages without fetching", async () => {
    let fetchCount = 0;

    globalThis.fetch = createMockFetch(() => {
      fetchCount += 1;

      return new Response(
        JSON.stringify({
          included: {
            stages: {
              "6": { id: 6, name: "To Do", color: "#8599f8" },
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const first = await getWorkflowStageNames(9);
    const second = await getWorkflowStageNames(9);

    expect(Array.from(first.entries())).toEqual([[6, { name: "To Do", color: "#8599f8" }]]);
    expect(Array.from(second.entries())).toEqual([[6, { name: "To Do", color: "#8599f8" }]]);
    expect(fetchCount).toBe(1);
  });

  test("refetches workflow stages when cache is stale", async () => {
    await Bun.write(
      `${getCacheDir()}/teamwork-workflow-stages.json`,
      `${JSON.stringify(
        {
          version: 2,
          workflows: {
            "9": {
              stages: { "6": { name: "Old Stage", color: "#000000" } },
              cachedAt: 0,
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    let fetchCount = 0;
    globalThis.fetch = createMockFetch(() => {
      fetchCount += 1;

      return new Response(
        JSON.stringify({
          included: {
            stages: {
              "6": { id: 6, name: "Updated Stage", color: "#ffffff" },
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const stages = await getWorkflowStageNames(9);

    expect(Array.from(stages.entries())).toEqual([[6, { name: "Updated Stage", color: "#ffffff" }]]);
    expect(fetchCount).toBe(1);
  });
});
