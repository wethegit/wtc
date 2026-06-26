import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import {
  configAuthDelete,
  configAuthSet,
  configAuthStatus,
  configInit,
  type ProviderActions,
} from "../../../src/cli/commands/config.ts";

const TEST_ROOT = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-command-tests-${process.pid}`;
const originalLog = console.log;
let logs: string[];

function mockActions(
  providerOverrides?: Partial<Record<"github" | "teamwork", Partial<ProviderActions>>>,
): Record<"github" | "teamwork", ProviderActions> {
  const defaults: ProviderActions = {
    setToken: async () => {},
    getStatus: async () => "missing",
    deleteToken: async () => false,
  };

  return {
    github: { ...defaults, ...providerOverrides?.github },
    teamwork: { ...defaults, ...providerOverrides?.teamwork },
  };
}

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
      mockActions({
        teamwork: {
          setToken: async (token) => {
            savedToken = token;
          },
        },
      }),
    );

    expect(savedToken).toBe("abc123");
    expect(logs).toContain("Configured teamwork auth.");
  });

  test("config auth set stores github token", async () => {
    let savedToken = "";

    await configAuthSet(
      { provider: "github", token: "ghp_abc123" },
      mockActions({
        github: {
          setToken: async (token) => {
            savedToken = token;
          },
        },
      }),
    );

    expect(savedToken).toBe("ghp_abc123");
    expect(logs).toContain("Configured github auth.");
  });

  test("config auth status prints teamwork status", async () => {
    await configAuthStatus(
      { provider: "teamwork" },
      mockActions({
        teamwork: { getStatus: async () => "configured" },
      }),
    );

    expect(logs).toContain("teamwork: configured");
  });

  test("config auth status prints github status", async () => {
    await configAuthStatus(
      { provider: "github" },
      mockActions({
        github: { getStatus: async () => "configured" },
      }),
    );

    expect(logs).toContain("github: configured");
  });

  test("config auth delete reports deleted teamwork auth", async () => {
    await configAuthDelete(
      { provider: "teamwork" },
      mockActions({
        teamwork: { deleteToken: async () => true },
      }),
    );

    expect(logs).toContain("Deleted teamwork auth.");
  });

  test("config auth delete reports deleted github auth", async () => {
    await configAuthDelete(
      { provider: "github" },
      mockActions({
        github: { deleteToken: async () => true },
      }),
    );

    expect(logs).toContain("Deleted github auth.");
  });

  test("config auth rejects unsupported providers", async () => {
    try {
      await configAuthStatus({ provider: "gitlab" });
      throw new Error("Expected configAuthStatus to reject.");
    } catch (error) {
      expect(error).toEqual(new Error("Unsupported auth provider: gitlab"));
    }
  });
});
