import { describe, expect, test } from "bun:test";

import type { LocalTimerEntry } from "../../src/api/teamwork/timers/local.ts";
import { getNextTeamworkTab } from "../../src/tui/pages/teamwork.tsx";
import {
  getNextPinnedTaskSelection,
  getPinnedTaskSelectionOrder,
  type PinnedTaskSelection,
} from "../../src/tui/pages/teamwork/project-tab.tsx";
import { getNextLocalTimerSelection } from "../../src/tui/pages/teamwork/timers-tab.tsx";

describe("teamwork page helpers", () => {
  test("cycles Teamwork tabs", () => {
    expect(getNextTeamworkTab("my-work", 1)).toBe("project");
    expect(getNextTeamworkTab("project", 1)).toBe("timers");
    expect(getNextTeamworkTab("timers", 1)).toBe("my-work");
    expect(getNextTeamworkTab("timers", -1)).toBe("project");
    expect(getNextTeamworkTab("project", -1)).toBe("my-work");
  });

  test("builds pinned task selection order", () => {
    expect(
      getPinnedTaskSelectionOrder([
        { id: 10, tasks: [{ id: 1 }, { id: 2 }] },
        { id: 20, tasks: [{ id: 3 }] },
      ]),
    ).toEqual([
      { taskListId: 10, taskId: 1 },
      { taskListId: 10, taskId: 2 },
      { taskListId: 20, taskId: 3 },
    ]);
  });

  test("cycles pinned task selection", () => {
    const taskLists = [
      { id: 10, tasks: [{ id: 1 }, { id: 2 }] },
      { id: 20, tasks: [{ id: 3 }] },
    ];
    const current: PinnedTaskSelection = { taskListId: 10, taskId: 2 };

    expect(getNextPinnedTaskSelection(taskLists, null, 1)).toEqual({ taskListId: 10, taskId: 1 });
    expect(getNextPinnedTaskSelection(taskLists, null, -1)).toEqual({ taskListId: 20, taskId: 3 });
    expect(getNextPinnedTaskSelection(taskLists, current, 1)).toEqual({
      taskListId: 20,
      taskId: 3,
    });
    expect(getNextPinnedTaskSelection(taskLists, current, -1)).toEqual({
      taskListId: 10,
      taskId: 1,
    });
    expect(getNextPinnedTaskSelection(taskLists, { taskListId: 99, taskId: 99 }, 1)).toEqual({
      taskListId: 10,
      taskId: 1,
    });
    expect(getNextPinnedTaskSelection([], current, 1)).toBeNull();
  });

  test("cycles local timer selection", () => {
    const timers: LocalTimerEntry[] = [
      {
        id: "timer-1",
        taskId: 1,
        taskName: "First",
        startTime: "2026-01-01T00:00:00Z",
        endTime: null,
        status: "running",
      },
      {
        id: "timer-2",
        taskId: 2,
        taskName: "Second",
        startTime: "2026-01-01T00:01:00Z",
        endTime: "2026-01-01T00:02:00Z",
        status: "stopped",
      },
    ];

    expect(getNextLocalTimerSelection(timers, null, 1)).toBe("timer-1");
    expect(getNextLocalTimerSelection(timers, null, -1)).toBe("timer-2");
    expect(getNextLocalTimerSelection(timers, "timer-1", 1)).toBe("timer-2");
    expect(getNextLocalTimerSelection(timers, "timer-1", -1)).toBe("timer-2");
    expect(getNextLocalTimerSelection(timers, "missing", 1)).toBe("timer-1");
    expect(getNextLocalTimerSelection([], "timer-1", 1)).toBeNull();
  });
});
