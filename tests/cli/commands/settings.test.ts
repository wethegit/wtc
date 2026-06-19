import { describe, expect, test } from "bun:test";

import { formatSettingsOutput } from "../../../src/cli/commands/settings.ts";
import type { ResolvedConfig } from "../../../src/config/schema.ts";

describe("settings command", () => {
  test("formats resolved config with project config path", () => {
    const config: ResolvedConfig = {
      user: { version: 1, workspaceName: "WTC" },
      project: {
        version: 1,
        project: { links: [] },
        teamwork: { projectId: 12345, pinnedTaskLists: [] },
      },
      paths: {
        userConfigPath: "/home/user/.config/wtc/wtc.yaml",
        projectConfigPath: "/repo/.wtc.yaml",
        projectConfigSearchStart: "/repo/packages/app",
      },
    };

    expect(formatSettingsOutput(config)).toBe(`User config: /home/user/.config/wtc/wtc.yaml
Project search start: /repo/packages/app
Project config: /repo/.wtc.yaml

{
  "user": {
    "version": 1,
    "workspaceName": "WTC"
  },
  "project": {
    "version": 1,
    "project": {
      "links": []
    },
    "teamwork": {
      "projectId": 12345,
      "pinnedTaskLists": []
    }
  }
}`);
  });

  test("formats resolved config without project config", () => {
    const config: ResolvedConfig = {
      user: { version: 1, workspaceName: "" },
      project: null,
      paths: {
        userConfigPath: "/home/user/.config/wtc/wtc.yaml",
        projectConfigPath: null,
        projectConfigSearchStart: "/repo",
      },
    };

    expect(formatSettingsOutput(config)).toContain("Project config: not found");
    expect(formatSettingsOutput(config)).toContain('"project": null');
  });
});
