import { describe, expect, test } from "bun:test";

const { parseLsRemoteOutput } = await import("../../../src/api/github/branches.ts");

describe("parseLsRemoteOutput", () => {
  test("returns empty branches for empty output", () => {
    const result = parseLsRemoteOutput("");
    expect(result.branches).toEqual([]);
    expect(result.defaultBranch).toBe("");
  });

  test("returns empty branches for whitespace-only output", () => {
    const result = parseLsRemoteOutput("  \n\n  ");
    expect(result.branches).toEqual([]);
    expect(result.defaultBranch).toBe("");
  });

  test("parses single branch as default", () => {
    const output = ["ref: refs/heads/main\tHEAD", "abc123\tHEAD", "abc123\trefs/heads/main"].join(
      "\n",
    );

    const result = parseLsRemoteOutput(output);

    expect(result.defaultBranch).toBe("main");
    expect(result.branches).toHaveLength(1);
    expect(result.branches[0]).toEqual({ name: "main", default: true });
  });

  test("marks default branch first and sorts rest alphabetically", () => {
    const output = [
      "ref: refs/heads/main\tHEAD",
      "abc123\tHEAD",
      "abc123\trefs/heads/develop",
      "abc123\trefs/heads/feature/login",
      "abc123\trefs/heads/main",
    ].join("\n");

    const result = parseLsRemoteOutput(output);

    expect(result.defaultBranch).toBe("main");
    expect(result.branches[0]).toEqual({ name: "main", default: true });
    expect(result.branches[1]).toEqual({ name: "develop", default: false });
    expect(result.branches[2]).toEqual({ name: "feature/login", default: false });
  });

  test("handles non-default default branch", () => {
    const output = [
      "ref: refs/heads/develop\tHEAD",
      "abc123\tHEAD",
      "abc123\trefs/heads/develop",
      "abc123\trefs/heads/main",
    ].join("\n");

    const result = parseLsRemoteOutput(output);

    expect(result.defaultBranch).toBe("develop");
    expect(result.branches[0]).toEqual({ name: "develop", default: true });
    expect(result.branches[1]).toEqual({ name: "main", default: false });
  });

  test("ignores non-head refs", () => {
    const output = [
      "ref: refs/heads/main\tHEAD",
      "abc123\tHEAD",
      "abc123\trefs/heads/main",
      "abc123\trefs/tags/v1.0.0",
      "abc123\trefs/notes/commits",
    ].join("\n");

    const result = parseLsRemoteOutput(output);

    expect(result.branches).toHaveLength(1);
    expect(result.branches[0]?.name).toBe("main");
  });
});
