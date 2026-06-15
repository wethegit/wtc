import { describe, expect, test } from "bun:test";

import { ProjectConfigSchema, UserConfigSchema } from "../../src/config/schema.ts";

describe("config schemas", () => {
  test("parses valid user config", () => {
    expect(UserConfigSchema.parse({ version: 1, workspaceName: "Marlon" })).toEqual({
      version: 1,
      workspaceName: "Marlon",
    });
  });

  test("defaults missing user workspace name", () => {
    expect(UserConfigSchema.parse({ version: 1 })).toEqual({
      version: 1,
      workspaceName: "",
    });
  });

  test("parses valid project config", () => {
    expect(ProjectConfigSchema.parse({ version: 1, teamworkProjectId: 12345 })).toEqual({
      version: 1,
      teamworkProjectId: 12345,
    });
  });

  test("defaults missing project teamwork project id", () => {
    expect(ProjectConfigSchema.parse({ version: 1 })).toEqual({
      version: 1,
      teamworkProjectId: null,
    });
  });

  test("rejects unsupported config versions", () => {
    expect(() => UserConfigSchema.parse({ version: 2, workspaceName: "Marlon" })).toThrow();
    expect(() => ProjectConfigSchema.parse({ version: 2, teamworkProjectId: 12345 })).toThrow();
  });

  test("rejects invalid teamwork project ids", () => {
    expect(() => ProjectConfigSchema.parse({ version: 1, teamworkProjectId: 0 })).toThrow();
    expect(() => ProjectConfigSchema.parse({ version: 1, teamworkProjectId: 1.5 })).toThrow();
    expect(() => ProjectConfigSchema.parse({ version: 1, teamworkProjectId: "12345" })).toThrow();
  });
});
