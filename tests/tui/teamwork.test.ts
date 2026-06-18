import { describe, expect, test } from "bun:test";

import { getNextTeamworkTab } from "../../src/tui/pages/teamwork.tsx";

describe("teamwork page helpers", () => {
  test("cycles Teamwork tabs", () => {
    expect(getNextTeamworkTab("my-work", 1)).toBe("project");
    expect(getNextTeamworkTab("project", 1)).toBe("my-work");
    expect(getNextTeamworkTab("project", -1)).toBe("my-work");
  });
});
