import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import { configInit } from "../../../src/cli/commands/config.ts";

const TEST_ROOT = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-command-tests-${process.pid}`;
const originalLog = console.log;

describe("config command", () => {
  beforeEach(async () => {
    console.log = () => {};
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
    expect(content).toContain("teamworkProjectId:");
  });

  test("config init fails when project config exists", async () => {
    await configInit(TEST_ROOT);

    await expect(configInit(TEST_ROOT)).rejects.toThrow(
      `Project config already exists: ${TEST_ROOT}/.wtc.yaml`,
    );
  });
});
