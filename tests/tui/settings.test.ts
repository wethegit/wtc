import { describe, expect, test } from "bun:test";

import {
  applySettingsFormState,
  buildSettingsFormState,
  getSettingsFormError,
  getNextSettingsFocus,
  getSettingsFocusOrder,
  parsePinnedTaskListId,
  parseTeamworkApiTokenInput,
  parseTeamworkProjectId,
  validateSettingsForm,
  type SettingsFormState,
} from "../../src/tui/pages/settings.tsx";
import type { ResolvedConfig } from "../../src/api/config/schema.ts";

describe("settings page helpers", () => {
  const resolvedConfig: ResolvedConfig = {
    user: { version: 1, workspaceName: "WTC" },
    project: {
      version: 1,
      project: { links: [{ name: "Figma", url: "https://figma.com/file/abc" }] },
      teamwork: {
        projectId: 12345,
        pinnedTaskLists: [{ name: "General Tasks", id: 1597639 }],
      },
    },
    paths: {
      userConfigPath: "/home/user/.config/wtc/wtc.yaml",
      projectConfigPath: "/repo/.wtc.yaml",
      projectConfigSearchStart: "/repo",
    },
  };

  const formState: SettingsFormState = {
    user: { workspaceName: "WTC", teamworkApiToken: "", githubApiToken: "" },
    project: {
      teamworkProjectId: "12345",
      links: [{ name: "Figma", url: "https://figma.com/file/abc" }],
      pinnedTaskLists: [{ name: "General Tasks", id: "1597639" }],
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

  test("parses pinned task list id", () => {
    expect(parsePinnedTaskListId("1597639")).toBe(1597639);
    expect(parsePinnedTaskListId("nope")).toBeNull();
  });

  test("builds settings form state", () => {
    expect(buildSettingsFormState(resolvedConfig)).toEqual(formState);
  });

  test("builds settings form state without project config", () => {
    expect(buildSettingsFormState({ ...resolvedConfig, project: null })).toEqual({
      user: { workspaceName: "WTC", teamworkApiToken: "", githubApiToken: "" },
      project: { teamworkProjectId: "", links: [], pinnedTaskLists: [] },
    });
  });

  test("builds dynamic settings focus order", () => {
    expect(getSettingsFocusOrder(formState)).toEqual([
      { type: "field", name: "workspaceName" },
      { type: "field", name: "teamworkApiToken" },
      { type: "field", name: "githubApiToken" },
      { type: "field", name: "teamworkProjectId" },
      { type: "listAction", list: "projectLinks", action: "add" },
      { type: "projectLink", index: 0, field: "name" },
      { type: "projectLink", index: 0, field: "url" },
      { type: "listAction", list: "projectLinks", action: "remove", index: 0 },
      { type: "listAction", list: "pinnedTaskLists", action: "add" },
      { type: "pinnedTaskList", index: 0, field: "name" },
      { type: "pinnedTaskList", index: 0, field: "id" },
      { type: "listAction", list: "pinnedTaskLists", action: "remove", index: 0 },
      { type: "action", name: "save" },
      { type: "action", name: "reload" },
    ]);
  });

  test("cycles settings control focus", () => {
    expect(getNextSettingsFocus({ type: "field", name: "workspaceName" }, formState, 1)).toEqual({
      type: "field",
      name: "teamworkApiToken",
    });
    expect(getNextSettingsFocus({ type: "field", name: "teamworkApiToken" }, formState, 1)).toEqual(
      { type: "field", name: "githubApiToken" },
    );
    expect(getNextSettingsFocus({ type: "field", name: "githubApiToken" }, formState, 1)).toEqual({
      type: "field",
      name: "teamworkProjectId",
    });
    expect(getNextSettingsFocus({ type: "action", name: "reload" }, formState, 1)).toEqual({
      type: "field",
      name: "workspaceName",
    });
    expect(getNextSettingsFocus({ type: "field", name: "workspaceName" }, formState, -1)).toEqual({
      type: "action",
      name: "reload",
    });
  });

  test("validates invalid settings form state", () => {
    const invalid: SettingsFormState = {
      user: { workspaceName: "WTC", teamworkApiToken: "", githubApiToken: "" },
      project: {
        teamworkProjectId: "abc",
        links: [{ name: "Figma", url: "not-a-url" }],
        pinnedTaskLists: [{ name: "General Tasks", id: "nope" }],
      },
    };

    expect(validateSettingsForm(invalid)).toEqual({
      teamworkProjectId: "Teamwork project ID must be a positive integer.",
      "projectLinks.0.url": "Project link URL must be valid.",
      "pinnedTaskLists.0.id": "Pinned task list ID must be a positive integer.",
    });
    expect(getSettingsFormError(invalid)).toBe("Teamwork project ID must be a positive integer.");
    expect(validateSettingsForm(formState)).toEqual({});
    expect(getSettingsFormError(formState)).toBeNull();
  });

  test("normalizes teamwork API token input", () => {
    expect(parseTeamworkApiTokenInput("  abc123  ")).toBe("abc123");
    expect(parseTeamworkApiTokenInput("   ")).toBeNull();
  });

  test("applies settings form state to config objects", () => {
    expect(
      applySettingsFormState({
        user: { workspaceName: "New", teamworkApiToken: "abc123", githubApiToken: "" },
        project: {
          teamworkProjectId: "98765",
          links: [{ name: "Docs", url: "https://docs.example.com" }],
          pinnedTaskLists: [{ name: "General Tasks", id: "1597639" }],
        },
      }),
    ).toEqual({
      user: { version: 1, workspaceName: "New" },
      project: {
        version: 1,
        project: { links: [{ name: "Docs", url: "https://docs.example.com" }] },
        teamwork: {
          projectId: 98765,
          pinnedTaskLists: [{ name: "General Tasks", id: 1597639 }],
        },
      },
    });
  });

  test("drops blank dynamic rows when applying settings form state", () => {
    expect(
      applySettingsFormState({
        user: { workspaceName: "New", teamworkApiToken: "", githubApiToken: "" },
        project: {
          teamworkProjectId: "",
          links: [{ name: "", url: "" }],
          pinnedTaskLists: [{ name: "", id: "" }],
        },
      }),
    ).toEqual({
      user: { version: 1, workspaceName: "New" },
      project: {
        version: 1,
        project: { links: [] },
        teamwork: { projectId: null, pinnedTaskLists: [] },
      },
    });
  });
});
