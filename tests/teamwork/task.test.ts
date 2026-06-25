import { describe, expect, mock, test, afterEach } from "bun:test";

import { createMockFetch, mockTeamworkAuthModule } from "../helpers/teamwork.ts";

mock.module("../../src/teamwork/auth.ts", mockTeamworkAuthModule);

const { getTeamworkTaskById } = await import("../../src/teamwork/task.ts");

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getTeamworkTaskById", () => {
  test("fetches a task by ID and returns id and name", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(
          JSON.stringify({
            task: { id: 12345, name: "Fix login bug", status: "active" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );

    const result = await getTeamworkTaskById(12345);

    expect(result).toEqual({ id: 12345, name: "Fix login bug" });
  });

  test("falls back to title when name is missing", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(
          JSON.stringify({
            task: { id: 12345, title: "Fix login bug" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );

    const result = await getTeamworkTaskById(12345);

    expect(result).toEqual({ id: 12345, name: "Fix login bug" });
  });

  test("falls back to content when name and title are missing", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(
          JSON.stringify({
            task: { id: 12345, content: "Fix login bug" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );

    const result = await getTeamworkTaskById(12345);

    expect(result).toEqual({ id: 12345, name: "Fix login bug" });
  });

  test("throws when response lacks any task name", async () => {
    globalThis.fetch = createMockFetch(
      () =>
        new Response(
          JSON.stringify({
            task: { id: 12345, status: "active" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );

    expect(getTeamworkTaskById(12345)).rejects.toThrow(
      "Teamwork task response did not include a task name",
    );
  });
});
