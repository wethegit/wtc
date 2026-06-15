import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  createDefaultProjectConfig,
  getProjectConfigPath,
  getUserConfigPath,
  initUserConfig,
  loadProjectConfig,
  loadResolvedConfig,
  loadUserConfig,
  saveProjectConfig,
  saveUserConfig,
} from "../../src/config/manager.ts";

const TEST_ROOT = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-tests-${process.pid}`;
const USER_CONFIG_DIR = `${TEST_ROOT}/user-config`;
const PROJECT_ROOT = `${TEST_ROOT}/project`;

async function resetTestRoot(): Promise<void> {
  await Bun.$`rm -rf ${TEST_ROOT}`.quiet();
  await Bun.$`mkdir -p ${PROJECT_ROOT}/packages/app`.quiet();
}

describe("config manager", () => {
  beforeEach(async () => {
    process.env.WTC_CONFIG_DIR = USER_CONFIG_DIR;
    await resetTestRoot();
  });

  afterEach(async () => {
    delete process.env.WTC_CONFIG_DIR;
    await Bun.$`rm -rf ${TEST_ROOT}`.quiet();
  });

  test("creates and loads default user config", async () => {
    await initUserConfig();

    expect(getUserConfigPath()).toBe(`${USER_CONFIG_DIR}/wtc.json`);
    expect(await loadUserConfig()).toEqual({
      version: 1,
      workspaceName: "",
    });
  });

  test("saves user config", async () => {
    await saveUserConfig({ version: 1, workspaceName: "Marlon" });

    expect(await loadUserConfig()).toEqual({
      version: 1,
      workspaceName: "Marlon",
    });
  });

  test("discovers nearest ancestor project config", async () => {
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.json`,
      JSON.stringify({ version: 1, teamworkProjectId: 12345 }),
    );

    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBe(
      `${PROJECT_ROOT}/.wtc.json`,
    );
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      teamworkProjectId: 12345,
    });
  });

  test("uses nearest project config when nested configs exist", async () => {
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.json`,
      JSON.stringify({ version: 1, teamworkProjectId: 1 }),
    );
    await Bun.write(
      `${PROJECT_ROOT}/packages/.wtc.json`,
      JSON.stringify({ version: 1, teamworkProjectId: 2 }),
    );

    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBe(
      `${PROJECT_ROOT}/packages/.wtc.json`,
    );
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      teamworkProjectId: 2,
    });
  });

  test("returns null when no project config exists", async () => {
    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBeNull();
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toBeNull();
  });

  test("creates project config in start directory when none exists", async () => {
    const projectPath = await saveProjectConfig(
      { ...createDefaultProjectConfig(), teamworkProjectId: 98765 },
      `${PROJECT_ROOT}/packages/app`,
    );

    expect(projectPath).toBe(`${PROJECT_ROOT}/packages/app/.wtc.json`);
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      teamworkProjectId: 98765,
    });
  });

  test("loads resolved config with paths", async () => {
    await saveUserConfig({ version: 1, workspaceName: "WTC" });
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.json`,
      JSON.stringify({ version: 1, teamworkProjectId: 12345 }),
    );

    expect(await loadResolvedConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      user: { version: 1, workspaceName: "WTC" },
      project: { version: 1, teamworkProjectId: 12345 },
      paths: {
        userConfigPath: `${USER_CONFIG_DIR}/wtc.json`,
        projectConfigPath: `${PROJECT_ROOT}/.wtc.json`,
        projectConfigSearchStart: `${PROJECT_ROOT}/packages/app`,
      },
    });
  });

  test("loads resolved config without project config", async () => {
    expect(await loadResolvedConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      user: { version: 1, workspaceName: "" },
      project: null,
      paths: {
        userConfigPath: `${USER_CONFIG_DIR}/wtc.json`,
        projectConfigPath: null,
        projectConfigSearchStart: `${PROJECT_ROOT}/packages/app`,
      },
    });
  });
});
