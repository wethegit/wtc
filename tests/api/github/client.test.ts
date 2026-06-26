import { describe, expect, test } from "bun:test";

import { getOctokit } from "../../../src/api/github/client.ts";

describe("github client", () => {
  test("getOctokit rejects when no token is stored", async () => {
    try {
      await getOctokit();
      throw new Error("Expected getOctokit to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("GitHub API token is missing."));
    }
  });
});
