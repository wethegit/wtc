import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { LocalTimerEntry } from "../../../src/teamwork/timers/local.ts";

const {
  formatTimerListOutput,
  teamworkTimerDiscard,
  teamworkTimerList,
  teamworkTimerStart,
  teamworkTimerStop,
  teamworkTimerSubmit,
  teamworkTimesheetOpen,
} = await import("../../../src/cli/commands/timers.ts");

const originalLog = console.log;
let logs: string[];

const timerA: LocalTimerEntry = {
  id: "timer-1",
  taskId: 1,
  taskName: "General | Code Review",
  startTime: "2026-06-24T10:00:00Z",
  endTime: null,
  status: "running",
};

const timerB: LocalTimerEntry = {
  id: "timer-2",
  taskId: 2,
  taskName: "Update README",
  startTime: "2026-06-24T09:00:00Z",
  endTime: "2026-06-24T09:30:00Z",
  status: "stopped",
};

const timerC: LocalTimerEntry = {
  id: "timer-3",
  taskId: 1,
  taskName: "General | Code Review",
  startTime: "2026-06-23T14:00:00Z",
  endTime: "2026-06-23T15:00:00Z",
  status: "stopped",
};

describe("teamwork timer commands", () => {
  beforeEach(() => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe("formatTimerListOutput", () => {
    test("formats timer list as text", () => {
      const output = formatTimerListOutput([timerA, timerB], { json: false });
      expect(output).toContain("Local timers:");
      expect(output).toContain("General | Code Review");
      expect(output).toContain("Update README");
      expect(output).toContain("running");
      expect(output).toContain("stopped");
    });

    test("formats timer list as JSON", () => {
      const output = formatTimerListOutput([timerA], { json: true });
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.taskId).toBe(1);
    });

    test("prints empty state", () => {
      const output = formatTimerListOutput([], { json: false });
      expect(output).toBe("No local timers.");
    });
  });

  describe("teamworkTimerList", () => {
    test("lists timers with default actions", async () => {
      const actions = {
        loadLocalTimers: async () => [timerA, timerB],
      };

      await teamworkTimerList({ json: false }, actions);
      expect(logs[0]).toContain("Local timers:");
    });

    test("lists timers as JSON", async () => {
      const actions = {
        loadLocalTimers: async () => [timerA, timerB],
      };

      await teamworkTimerList({ json: true }, actions);
      const parsed = JSON.parse(logs[0] ?? "");
      expect(parsed).toHaveLength(2);
    });
  });

  describe("teamworkTimerStart", () => {
    test("starts a timer for a task", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: Number(value),
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        getTeamworkTaskById: async (id: number) => ({ id, name: "General | Code Review" }),
        startLocalTimer: async (taskId: number, taskName: string) => ({
          id: "new-timer",
          taskId,
          taskName,
          startTime: "2026-06-24T12:00:00Z",
          endTime: null,
          status: "running",
        } satisfies LocalTimerEntry),
      };

      await teamworkTimerStart({ task: "12345" }, actions);
      expect(logs[0]).toContain("Timer started for");
      expect(logs[0]).toContain("General | Code Review");
    });
  });

  describe("teamworkTimerStop", () => {
    test("stops a running timer for a task", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 1,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => ({
          ...timerA,
          status: "stopped" as const,
          endTime: new Date().toISOString(),
        }),
      };

      await teamworkTimerStop({ task: "1" }, actions);
      expect(logs[0]).toContain("Timer stopped for");
      expect(logs[0]).toContain("General | Code Review");
    });

    test("reports when timer is already stopped", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 2,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => null,
      };

      await teamworkTimerStop({ task: "2" }, actions);
      expect(logs[0]).toContain("already stopped");
    });

    test("reports when no timer exists for the task, showing existing timers", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 99,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => null,
      };

      await teamworkTimerStop({ task: "99" }, actions);
      expect(logs[0]).toContain("No local timer found");
      expect(logs[0]).toContain("Existing timers:");
      expect(logs[0]).toContain("General | Code Review");
      expect(logs[0]).toContain("Update README");
    });
  });

  describe("teamworkTimerSubmit", () => {
    test("submits a stopped timer", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 2,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => null,
        createTaskTimeEntry: async () => 42,
        removeLocalTimer: async () => {},
      };

      await teamworkTimerSubmit({ task: "2" }, actions);
      expect(logs[0]).toContain("Timer submitted");
      expect(logs[0]).toContain("Update README");
    });

    test("submits a running timer (stops first)", async () => {
      let stopped = false;
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 1,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => {
          stopped = true;
          return { ...timerA, status: "stopped" as const, endTime: new Date().toISOString() };
        },
        createTaskTimeEntry: async () => 42,
        removeLocalTimer: async () => {},
      };

      await teamworkTimerSubmit({ task: "1" }, actions);
      expect(stopped).toBe(true);
      expect(logs[0]).toContain("Timer submitted");
    });

    test("reports when no timer exists, showing existing timers", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 99,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        stopLocalTimer: async () => null,
        createTaskTimeEntry: async () => 42,
        removeLocalTimer: async () => {},
      };

      await teamworkTimerSubmit({ task: "99" }, actions);
      expect(logs[0]).toContain("No local timer found");
      expect(logs[0]).toContain("Existing timers:");
      expect(logs[0]).toContain("General | Code Review");
      expect(logs[0]).toContain("Update README");
    });
  });

  describe("teamworkTimerDiscard", () => {
    test("discards a timer for a task", async () => {
      let removedId = "";
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 2,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        removeLocalTimer: async (id: string) => {
          removedId = id;
        },
      };

      await teamworkTimerDiscard({ task: "2" }, actions);
      expect(removedId).toBe("timer-2");
      expect(logs[0]).toContain("Timer discarded");
    });

    test("reports when no timer exists, showing existing timers", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 99,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerB],
        removeLocalTimer: async () => {},
      };

      await teamworkTimerDiscard({ task: "99" }, actions);
      expect(logs[0]).toContain("No local timer found");
      expect(logs[0]).toContain("Existing timers:");
      expect(logs[0]).toContain("General | Code Review");
      expect(logs[0]).toContain("Update README");
    });

    test("rejects ambiguous multiple timers for the same task", async () => {
      const actions = {
        getTeamworkTaskReference: (value: string) => ({
          id: 1,
          url: `https://teamwork.com/app/tasks/${value}`,
        }),
        loadLocalTimers: async () => [timerA, timerC],
        removeLocalTimer: async () => {},
      };

      await teamworkTimerDiscard({ task: "1" }, actions);
      expect(logs[0]).toContain("Multiple local timers found");
    });
  });

  describe("teamworkTimesheetOpen", () => {
    test("opens timesheet in browser", async () => {
      let openedUrl = "";
      const actions = {
        openUrlInBrowser: async (url: string) => {
          openedUrl = url;
        },
      };

      await teamworkTimesheetOpen({}, actions);
      expect(openedUrl).toContain("teamwork.com");
      expect(logs[0]).toContain("Opened Teamwork timesheet");
    });
  });
});
