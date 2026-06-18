import { describe, expect, test } from "bun:test";

import {
  applySettingsFormState,
  buildSettingsFormState,
  getSettingsFormError,
  getNextSettingsFocus,
  parseTeamworkProjectId,
  validateSettingsForm,
} from "../../src/tui/pages/settings.tsx";
import type { ResolvedConfig } from "../../src/config/schema.ts";

describe("settings page helpers", () => {
  const resolvedConfig: ResolvedConfig = {
    user: { version: 1, workspaceName: "WTC" },
    project: { version: 1, project: { links: [] }, teamwork: { projectId: 12345 } },
    paths: {
      userConfigPath: "/home/user/.config/wtc/wtc.yaml",
      projectConfigPath: "/repo/.wtc.yaml",
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

  test("cycles settings control focus", () => {
    expect(getNextSettingsFocus("workspaceName", 1)).toBe("teamworkProjectId");
    expect(getNextSettingsFocus("teamworkProjectId", 1)).toBe("save");
    expect(getNextSettingsFocus("save", 1)).toBe("reload");
    expect(getNextSettingsFocus("reload", 1)).toBe("workspaceName");
    expect(getNextSettingsFocus("workspaceName", -1)).toBe("reload");
  });

  test("validates invalid teamwork project id text", () => {
    expect(validateSettingsForm({ workspaceName: "WTC", teamworkProjectId: "abc" })).toEqual({
      teamworkProjectId: "Teamwork project ID must be a positive integer.",
    });
    expect(validateSettingsForm({ workspaceName: "WTC", teamworkProjectId: "" })).toEqual({});
    expect(getSettingsFormError({ workspaceName: "WTC", teamworkProjectId: "abc" })).toBe(
      "Teamwork project ID must be a positive integer.",
    );
    expect(getSettingsFormError({ workspaceName: "WTC", teamworkProjectId: "" })).toBeNull();
  });

  test("applies settings form state to config objects", () => {
    expect(applySettingsFormState({ workspaceName: "New", teamworkProjectId: "98765" })).toEqual({
      user: { version: 1, workspaceName: "New" },
      project: { version: 1, project: { links: [] }, teamwork: { projectId: 98765 } },
    });
  });

  test("preserves existing project links when applying settings form state", () => {
    expect(
      applySettingsFormState(
        { workspaceName: "New", teamworkProjectId: "98765" },
        {
          version: 1,
          project: { links: [{ name: "Figma", url: "https://figma.com/file/abc" }] },
          teamwork: { projectId: 12345 },
        },
      ),
    ).toEqual({
      user: { version: 1, workspaceName: "New" },
      project: {
        version: 1,
        project: { links: [{ name: "Figma", url: "https://figma.com/file/abc" }] },
        teamwork: { projectId: 98765 },
      },
    });
  });
});
