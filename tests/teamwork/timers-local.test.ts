import { describe, expect, test } from "bun:test";

import { useTempCacheDir } from "../helpers/teamwork.ts";

useTempCacheDir();

const {
  loadLocalTimers,
  startLocalTimer,
  stopLocalTimer,
  getRunningTimer,
  removeLocalTimer,
  getLocalTimerElapsedMs,
  formatTimerDuration,
} = await import("../../src/teamwork/timers/local.ts");

describe("getRunningTimer", () => {
  test("returns null when no timers are running", () => {
    expect(getRunningTimer([])).toBeNull();

    expect(
      getRunningTimer([
        {
          id: "1",
          taskId: 1,
          taskName: "Test",
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T01:00:00Z",
          status: "stopped",
        },
      ]),
    ).toBeNull();
  });

  test("returns the running timer when one exists", () => {
    const timer = getRunningTimer([
      {
        id: "1",
        taskId: 1,
        taskName: "Test",
        startTime: "2026-01-01T00:00:00Z",
        endTime: null,
        status: "running",
      },
    ]);

    expect(timer).toBeDefined();
    expect(timer?.id).toBe("1");
  });
});

describe("getLocalTimerElapsedMs", () => {
  test("uses current time for running timers", () => {
    expect(
      getLocalTimerElapsedMs(
        {
          id: "1",
          taskId: 1,
          taskName: "Test",
          startTime: "2026-01-01T00:00:00Z",
          endTime: null,
          status: "running",
        },
        new Date("2026-01-01T00:01:30Z"),
      ),
    ).toBe(90_000);
  });

  test("uses end time for stopped timers", () => {
    expect(
      getLocalTimerElapsedMs(
        {
          id: "1",
          taskId: 1,
          taskName: "Test",
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:02:05Z",
          status: "stopped",
        },
        new Date("2026-01-01T00:10:00Z"),
      ),
    ).toBe(125_000);
  });

  test("never returns negative durations", () => {
    expect(
      getLocalTimerElapsedMs(
        {
          id: "1",
          taskId: 1,
          taskName: "Test",
          startTime: "2026-01-01T00:01:00Z",
          endTime: "2026-01-01T00:00:00Z",
          status: "stopped",
        },
        new Date("2026-01-01T00:10:00Z"),
      ),
    ).toBe(0);
  });
});

describe("formatTimerDuration", () => {
  test("formats sub-hour durations", () => {
    expect(formatTimerDuration(0)).toBe("0m 00s");
    expect(formatTimerDuration(65_000)).toBe("1m 05s");
  });

  test("formats hour durations", () => {
    expect(formatTimerDuration(3_723_000)).toBe("1h 02m 03s");
  });
});

describe("startLocalTimer", () => {
  test("starts a local timer", async () => {
    const { timer, stoppedPrevious } = await startLocalTimer(42, "My Task");

    expect(timer.taskId).toBe(42);
    expect(timer.taskName).toBe("My Task");
    expect(timer.status).toBe("running");
    expect(timer.endTime).toBeNull();
    expect(timer.id).toBeTruthy();
    expect(timer.startTime).toBeTruthy();
    expect(stoppedPrevious).toBe(false);
  });

  test("stops previous running timer when starting a new one", async () => {
    const { timer: first } = await startLocalTimer(1, "First");
    const { timer: second, stoppedPrevious } = await startLocalTimer(2, "Second");

    expect(stoppedPrevious).toBe(true);

    const timers = await loadLocalTimers();
    const firstEntry = timers.find((t) => t.id === first.id);
    expect(firstEntry).toBeDefined();
    expect(firstEntry?.status).toBe("stopped");
    expect(firstEntry?.endTime).not.toBeNull();
    expect(second.status).toBe("running");
  });

  test("persists to cache", async () => {
    await startLocalTimer(42, "My Task");

    const timers = await loadLocalTimers();
    expect(timers).toHaveLength(1);
    expect(timers[0]?.taskId).toBe(42);
  });
});

describe("stopLocalTimer", () => {
  test("stops the running timer", async () => {
    await startLocalTimer(42, "My Task");
    const stopped = await stopLocalTimer();

    expect(stopped).toBeDefined();
    expect(stopped?.status).toBe("stopped");
    expect(stopped?.endTime).not.toBeNull();

    const timers = await loadLocalTimers();
    const entry = timers.find((t) => t.id === stopped?.id);
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("stopped");
  });

  test("returns null when no timer is running", async () => {
    const result = await stopLocalTimer();
    expect(result).toBeNull();
  });
});

describe("removeLocalTimer", () => {
  test("removes a timer by id", async () => {
    const { timer } = await startLocalTimer(42, "My Task");
    expect((await loadLocalTimers()).length).toBe(1);

    await removeLocalTimer(timer.id);
    expect((await loadLocalTimers()).length).toBe(0);
  });

  test("does nothing when id does not exist", async () => {
    await startLocalTimer(42, "My Task");
    await removeLocalTimer("nonexistent");
    expect((await loadLocalTimers()).length).toBe(1);
  });
});
