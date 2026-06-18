import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import {
  configAuthDelete,
  configAuthSet,
  configAuthStatus,
  configInit,
} from "../../../src/cli/commands/config.ts";

const TEST_ROOT = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-command-tests-${process.pid}`;
const originalLog = console.log;
let logs: string[];

describe("config command", () => {
  beforeEach(async () => {
    logs = [];
    console.log = (message?: unknown) => {
      logs.push(String(message));
    };
    await rm(TEST_ROOT, { recursive: true, force: true });
    await mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    console.log = originalLog;
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  test("config init creates project config", async () => {
    await configInit(TEST_ROOT);

    const content = await Bun.file(`${TEST_ROOT}/.wtc.yaml`).text();
    expect(content).toContain("# WTC project-level configuration.");
    expect(content).toContain("teamwork:");
    expect(content).toContain("projectId:");
  });

  test("config init fails when project config exists", async () => {
    await configInit(TEST_ROOT);

    try {
      await configInit(TEST_ROOT);
      throw new Error("Expected configInit to reject.");
    } catch (error) {
      expect(error).toEqual(new Error(`Project config already exists: ${TEST_ROOT}/.wtc.yaml`));
    }
  });

  test("config auth set stores teamwork token", async () => {
    let savedToken = "";

    await configAuthSet(
      { provider: "teamwork", token: "abc123" },
      {
        setTeamworkApiToken: async (token) => {
          savedToken = token;
        },
        getTeamworkAuthStatus: async () => "missing",
        deleteTeamworkApiToken: async () => false,
      },
    );

    expect(savedToken).toBe("abc123");
    expect(logs).toContain("Configured teamwork auth.");
  });

  test("config auth status prints teamwork status", async () => {
    await configAuthStatus(
      { provider: "teamwork" },
      {
        setTeamworkApiToken: async () => {},
        getTeamworkAuthStatus: async () => "configured",
        deleteTeamworkApiToken: async () => false,
      },
    );

    expect(logs).toContain("teamwork: configured");
  });

  test("config auth delete reports deleted teamwork auth", async () => {
    await configAuthDelete(
      { provider: "teamwork" },
      {
        setTeamworkApiToken: async () => {},
        getTeamworkAuthStatus: async () => "configured",
        deleteTeamworkApiToken: async () => true,
      },
    );

    expect(logs).toContain("Deleted teamwork auth.");
  });

  test("config auth rejects unsupported providers", async () => {
    try {
      await configAuthStatus({ provider: "github" });
      throw new Error("Expected configAuthStatus to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Unsupported auth provider: github"));
    }
  });
});
