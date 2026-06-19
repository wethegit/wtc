import { afterEach, describe, expect, mock, test } from "bun:test";

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
const { getTeamworkTaskListTasks } = await import("../../src/teamwork/task-list-tasks.ts");
import { TEAMWORK_API_BASE_URL } from "../../src/teamwork/consts.ts";

const originalFetch = globalThis.fetch;

describe("teamwork task list tasks", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("gets tasks for a Teamwork task list", async () => {
    let requestedUrl = "";
    let authorization = "";

    globalThis.fetch = Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        requestedUrl = input instanceof Request ? input.url : String(input);
        authorization = new Headers(init?.headers).get("Authorization") ?? "";

        return new Response(
          JSON.stringify({
            tasks: [
              { id: "1", name: "Dev | Code Review", status: "active" },
              { id: 2, content: "General | Meeting" },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
      { preconnect: originalFetch.preconnect },
    );

    const tasks = await getTeamworkTaskListTasks(1597639);

    expect(tasks).toEqual([
      { id: 1, name: "Dev | Code Review", status: "active", url: null },
      { id: 2, name: "General | Meeting", status: null, url: null },
    ]);
    expect(requestedUrl).toBe(`${TEAMWORK_API_BASE_URL}/tasklists/1597639/tasks.json`);
    expect(authorization).toBe(createTeamworkAuthorizationHeader("token-123"));
  });
});
