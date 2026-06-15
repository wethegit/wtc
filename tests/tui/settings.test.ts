import { describe, expect, test } from "bun:test";

import {
  applySettingsFormState,
  buildSettingsFormState,
  getSettingsFormError,
  parseTeamworkProjectId,
} from "../../src/tui/pages/settings.tsx";
import type { ResolvedConfig } from "../../src/config/schema.ts";

describe("settings page helpers", () => {
  const resolvedConfig: ResolvedConfig = {
    user: { version: 1, workspaceName: "WTC" },
    project: { version: 1, teamworkProjectId: 12345 },
    paths: {
      userConfigPath: "/home/user/.config/wtc/wtc.json",
      projectConfigPath: "/repo/.wtc.json",
      projectConfigSearchStart: "/repo",
    },
  };

  test("parses optional teamwork project id", () => {
    expect(parseTeamworkProjectId("")).toBeNull();
    expect(parseTeamworkProjectId("  ")).toBeNull();
    expect(parseTeamworkProjectId("12345")).toBe(12345);
  });

  test("rejects invalid teamwork project id input", () => {
    expect(parseTeamworkProjectId("abc")).toBeNull();
    expect(parseTeamworkProjectId("0")).toBeNull();
    expect(parseTeamworkProjectId("1.5")).toBeNull();
  });

  test("builds settings form state", () => {
    expect(buildSettingsFormState(resolvedConfig)).toEqual({
      workspaceName: "WTC",
      teamworkProjectId: "12345",
    });
  });

  test("builds settings form state without project config", () => {
    expect(buildSettingsFormState({ ...resolvedConfig, project: null })).toEqual({
      workspaceName: "WTC",
      teamworkProjectId: "",
    });
  });

  test("validates invalid teamwork project id text", () => {
    expect(getSettingsFormError({ workspaceName: "WTC", teamworkProjectId: "abc" })).toBe(
      "Teamwork project ID must be a positive integer.",
    );
    expect(getSettingsFormError({ workspaceName: "WTC", teamworkProjectId: "" })).toBeNull();
  });

  test("applies settings form state to config objects", () => {
    expect(applySettingsFormState({ workspaceName: "New", teamworkProjectId: "98765" })).toEqual({
      user: { version: 1, workspaceName: "New" },
      project: { version: 1, teamworkProjectId: 98765 },
    });
  });
});
