import { describe, expect, mock, test, afterEach } from "bun:test";

import { createMockFetch, mockTeamworkAuthModule } from "../helpers/teamwork.ts";
import { TEAMWORK_API_BASE_URL } from "../../src/teamwork/consts.ts";

mock.module("../../src/teamwork/auth.ts", mockTeamworkAuthModule);

const { createTeamworkAuthorizationHeader } = await import("../../src/teamwork/auth.ts");
const { createTaskTimeEntry, getTimers, pauseTimer, startTimer } =
  await import("../../src/teamwork/timers.ts");

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("startTimer", () => {
  test("starts a timer for a task and returns it", async () => {
    let requestUrl = "";
    let requestBody = "";
    let requestMethod = "";
    let authorization = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestUrl = url;
      requestMethod = init?.method ?? "GET";
      requestBody = typeof init?.body === "string" ? init.body : "";
      authorization = new Headers(init?.headers).get("Authorization") ?? "";

      return new Response(
        JSON.stringify({
          timer: {
            id: 42,
            running: true,
            description: "",
            taskId: 12345,
            projectId: 67890,
            duration: 0,
            lastStartedAt: "2026-06-23T00:48:01Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const timer = await startTimer(12345);

    expect(timer).toEqual({
      id: 42,
      running: true,
      description: "",
      taskId: 12345,
      projectId: 67890,
      duration: 0,
      lastStartedAt: "2026-06-23T00:48:01Z",
    });

    expect(requestUrl).toBe(`${TEAMWORK_API_BASE_URL}/me/timers.json`);
    expect(requestMethod).toBe("POST");
    expect(requestBody).toBe(JSON.stringify({ timer: { taskId: 12345 } }));
    expect(authorization).toBe(createTeamworkAuthorizationHeader("token-123"));
  });

  test("throws if response has no timer", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await startTimer(12345);
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe("Teamwork timer response did not include a timer.");
    }
  });

  test("throws if timer has no id", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(JSON.stringify({ timer: { running: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await startTimer(12345);
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe("Teamwork timer response did not include a timer.");
    }
  });
});

describe("pauseTimer", () => {
  test("pauses a running timer and returns it", async () => {
    let requestUrl = "";
    let requestMethod = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestUrl = url;
      requestMethod = init?.method ?? "GET";

      return new Response(
        JSON.stringify({
          timer: {
            id: 42,
            running: false,
            description: "",
            taskId: 12345,
            projectId: 67890,
            duration: 3600,
            lastStartedAt: null,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const timer = await pauseTimer(42);

    expect(timer).toEqual({
      id: 42,
      running: false,
      description: "",
      taskId: 12345,
      projectId: 67890,
      duration: 3600,
      lastStartedAt: null,
    });

    expect(requestUrl).toBe(`${TEAMWORK_API_BASE_URL}/me/timers/42/pause.json`);
    expect(requestMethod).toBe("PUT");
  });

  test("throws if response has no timer", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await pauseTimer(42);
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe(
        "Teamwork timer pause response did not include a timer.",
      );
    }
  });
});

describe("getTimers", () => {
  test("lists timers for the current user", async () => {
    let requestUrl = "";

    globalThis.fetch = createMockFetch((url) => {
      requestUrl = url;

      return new Response(
        JSON.stringify({
          timers: [
            {
              id: 42,
              running: true,
              description: "Working on task",
              taskId: 12345,
              projectId: 67890,
              duration: 0,
              lastStartedAt: "2026-06-23T00:48:01Z",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const timers = await getTimers();

    expect(timers).toHaveLength(1);
    expect(timers[0]).toEqual({
      id: 42,
      running: true,
      description: "Working on task",
      taskId: 12345,
      projectId: 67890,
      duration: 0,
      lastStartedAt: "2026-06-23T00:48:01Z",
    });

    expect(requestUrl).toBe(`${TEAMWORK_API_BASE_URL}/me/timers.json`);
  });

  test("throws if response has no timers array", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await getTimers();
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe(
        "Teamwork timers response did not include a timers array.",
      );
    }
  });
});

describe("createTaskTimeEntry", () => {
  test("creates a submitted time entry for a task", async () => {
    let requestUrl = "";
    let requestMethod = "";
    let requestBody = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestUrl = url;
      requestMethod = init?.method ?? "GET";
      requestBody = typeof init?.body === "string" ? init.body : "";

      return new Response(JSON.stringify({ timelog: { id: 99 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const id = await createTaskTimeEntry({
      taskId: 12345,
      date: "2026-06-24",
      hours: 1,
      minutes: 15,
      description: "Code review",
    });

    expect(id).toBe(99);
    expect(requestUrl).toBe(`${TEAMWORK_API_BASE_URL}/tasks/12345/time.json`);
    expect(requestMethod).toBe("POST");
    expect(JSON.parse(requestBody)).toEqual({
      timelog: {
        taskId: 12345,
        isUtc: true,
        date: "2026-06-24",
        hours: 1,
        minutes: 15,
        description: "Code review",
      },
      timelogOptions: {},
      tags: [],
    });
  });

  test("throws if response has no timelog id", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await createTaskTimeEntry({
        taskId: 12345,
        date: "2026-06-24",
        hours: 0,
        minutes: 30,
        description: "",
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  test("validates input before calling Teamwork", async () => {
    let called = false;
    globalThis.fetch = createMockFetch(() => {
      called = true;
      return new Response(JSON.stringify({ timelog: { id: 99 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    try {
      await createTaskTimeEntry({
        taskId: 12345,
        date: "2026/06/24",
        hours: 0,
        minutes: 30,
        description: "Invalid date",
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(called).toBe(false);
    }
  });
});
