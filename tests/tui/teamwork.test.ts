import { describe, expect, test } from "bun:test";

import { getNextTeamworkTab } from "../../src/tui/pages/teamwork.tsx";
import {
  getNextPinnedTaskSelection,
  getPinnedTaskSelectionOrder,
  type PinnedTaskSelection,
} from "../../src/tui/pages/teamwork/project-tab.tsx";

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
});
