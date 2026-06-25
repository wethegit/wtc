import { describe, expect, test } from "bun:test";

import { TEAMWORK_BASE_URL } from "../../../src/api/teamwork/consts.ts";
import { getTeamworkTaskReference } from "../../../src/api/teamwork/tasks.ts";

describe("teamwork task references", () => {
  test("builds task reference from numeric ID", () => {
    expect(getTeamworkTaskReference("12345")).toEqual({
      id: 12345,
      url: `${TEAMWORK_BASE_URL}/app/tasks/12345`,
    });
  });

  test("builds task reference from Teamwork URL", () => {
    expect(getTeamworkTaskReference(`${TEAMWORK_BASE_URL}/app/tasks/12345?view=details`)).toEqual({
      id: 12345,
      url: `${TEAMWORK_BASE_URL}/app/tasks/12345?view=details`,
    });
  });

  test("rejects non-Teamwork task references", () => {
    expect(() => getTeamworkTaskReference("https://example.com/app/tasks/12345")).toThrow(
      "Teamwork task URL must use the configured Teamwork site.",
    );
    expect(() => getTeamworkTaskReference("not-a-task")).toThrow(
      "Teamwork task must be a numeric ID or Teamwork task URL.",
    );
  });
});
