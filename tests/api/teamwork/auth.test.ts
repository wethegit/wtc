import { describe, expect, test } from "bun:test";

import { createTeamworkAuthorizationHeader } from "../../../src/api/teamwork/auth.ts";

describe("teamwork auth", () => {
  test("builds basic authorization header from API token", () => {
    expect(createTeamworkAuthorizationHeader("abc123")).toBe("Basic YWJjMTIzOnBhc3N3b3Jk");
  });
});
