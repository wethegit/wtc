import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import {
  getProjectConfigPath,
  getUserConfigPath,
  initProjectConfig,
  initUserConfig,
  loadProjectConfig,
  loadResolvedConfig,
  loadUserConfig,
  saveProjectConfig,
  saveUserConfig,
} from "../../../src/api/config/manager.ts";

const TEST_ROOT = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-tests-${process.pid}`;
const USER_CONFIG_DIR = `${TEST_ROOT}/user-config`;
const PROJECT_ROOT = `${TEST_ROOT}/project`;

async function resetTestRoot(): Promise<void> {
  await rm(TEST_ROOT, { recursive: true, force: true });
  await mkdir(`${PROJECT_ROOT}/packages/app`, { recursive: true });
}

describe("config manager", () => {
  beforeEach(async () => {
    process.env.WTC_CONFIG_DIR = USER_CONFIG_DIR;
    await resetTestRoot();
  });

  afterEach(async () => {
    delete process.env.WTC_CONFIG_DIR;
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  test("creates and loads default user config", async () => {
    await initUserConfig();

    expect(getUserConfigPath()).toBe(`${USER_CONFIG_DIR}/wtc.yaml`);
    expect(await loadUserConfig()).toEqual({
      version: 1,
      workspaceName: "",
    });
  });

  test("creates default user config with comments", async () => {
    await initUserConfig();

    const content = await Bun.file(getUserConfigPath()).text();
    expect(content).toContain("# WTC user-level configuration.");
    expect(content).toContain("# Friendly workspace label shown in WTC.");
  });

  test("saves user config", async () => {
    await saveUserConfig({ version: 1, workspaceName: "Marlon" });

    expect(await loadUserConfig()).toEqual({
      version: 1,
      workspaceName: "Marlon",
    });
    expect(await Bun.file(getUserConfigPath()).text()).toContain(
      "# Friendly workspace label shown in WTC.",
    );
  });

  test("discovers nearest ancestor project config", async () => {
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.yaml`,
      "version: 1\nproject:\n  links: []\nteamwork:\n  projectId: 12345\n",
    );

    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBe(
      `${PROJECT_ROOT}/.wtc.yaml`,
    );
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      project: { links: [] },
      teamwork: { projectId: 12345, pinnedTaskLists: [] },
    });
  });

  test("uses nearest project config when nested configs exist", async () => {
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.yaml`,
      "version: 1\nproject:\n  links: []\nteamwork:\n  projectId: 1\n",
    );
    await Bun.write(
      `${PROJECT_ROOT}/packages/.wtc.yaml`,
      "version: 1\nproject:\n  links: []\nteamwork:\n  projectId: 2\n",
    );

    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBe(
      `${PROJECT_ROOT}/packages/.wtc.yaml`,
    );
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      project: { links: [] },
      teamwork: { projectId: 2, pinnedTaskLists: [] },
    });
  });

  test("returns null when no project config exists", async () => {
    expect(await getProjectConfigPath(`${PROJECT_ROOT}/packages/app`)).toBeNull();
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toBeNull();
  });

  test("creates project config in start directory when none exists", async () => {
    const projectPath = await saveProjectConfig(
      { version: 1, project: { links: [] }, teamwork: { projectId: 98765, pinnedTaskLists: [] } },
      `${PROJECT_ROOT}/packages/app`,
    );

    expect(projectPath).toBe(`${PROJECT_ROOT}/packages/app/.wtc.yaml`);
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      project: { links: [] },
      teamwork: { projectId: 98765, pinnedTaskLists: [] },
    });
    expect(await Bun.file(projectPath).text()).toContain(
      "# Teamwork project ID linked to this repository.",
    );
  });

  test("saves project links", async () => {
    const projectPath = await saveProjectConfig(
      {
        version: 1,
        project: { links: [{ name: "Figma", url: "https://figma.com/file/abc" }] },
        teamwork: { projectId: null, pinnedTaskLists: [] },
      },
      PROJECT_ROOT,
    );

    expect(await loadProjectConfig(PROJECT_ROOT)).toEqual({
      version: 1,
      project: { links: [{ name: "Figma", url: "https://figma.com/file/abc" }] },
      teamwork: { projectId: null, pinnedTaskLists: [] },
    });
    expect(await Bun.file(projectPath).text()).toContain('links:\n    - name: "Figma"');
  });

  test("saves pinned Teamwork task lists", async () => {
    const projectPath = await saveProjectConfig(
      {
        version: 1,
        project: { links: [] },
        teamwork: {
          projectId: 362632,
          pinnedTaskLists: [{ name: "General Tasks", id: 1597639 }],
        },
      },
      PROJECT_ROOT,
    );

    expect(await loadProjectConfig(PROJECT_ROOT)).toEqual({
      version: 1,
      project: { links: [] },
      teamwork: {
        projectId: 362632,
        pinnedTaskLists: [{ name: "General Tasks", id: 1597639 }],
      },
    });
    expect(await Bun.file(projectPath).text()).toContain(
      'pinnedTaskLists:\n    - name: "General Tasks"',
    );
  });

  test("initializes project config with comments", async () => {
    const projectPath = await initProjectConfig(`${PROJECT_ROOT}/packages/app`);

    expect(projectPath).toBe(`${PROJECT_ROOT}/packages/app/.wtc.yaml`);
    const content = await Bun.file(projectPath).text();
    expect(content).toContain("# WTC project-level configuration.");
    expect(content).toContain("# Teamwork project ID linked to this repository.");
    expect(await loadProjectConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      version: 1,
      project: { links: [] },
      teamwork: { projectId: null, pinnedTaskLists: [] },
    });
  });

  test("project config init fails when config already exists", async () => {
    await initProjectConfig(PROJECT_ROOT);

    await expect(initProjectConfig(PROJECT_ROOT)).rejects.toThrow(
      `Project config already exists: ${PROJECT_ROOT}/.wtc.yaml`,
    );
  });

  test("loads resolved config with paths", async () => {
    await saveUserConfig({ version: 1, workspaceName: "WTC" });
    await Bun.write(
      `${PROJECT_ROOT}/.wtc.yaml`,
      "version: 1\nproject:\n  links: []\nteamwork:\n  projectId: 12345\n",
    );

    expect(await loadResolvedConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      user: { version: 1, workspaceName: "WTC" },
      project: {
        version: 1,
        project: { links: [] },
        teamwork: { projectId: 12345, pinnedTaskLists: [] },
      },
      paths: {
        userConfigPath: `${USER_CONFIG_DIR}/wtc.yaml`,
        projectConfigPath: `${PROJECT_ROOT}/.wtc.yaml`,
        projectConfigSearchStart: `${PROJECT_ROOT}/packages/app`,
      },
    });
  });

  test("loads resolved config without project config", async () => {
    expect(await loadResolvedConfig(`${PROJECT_ROOT}/packages/app`)).toEqual({
      user: { version: 1, workspaceName: "" },
      project: null,
      paths: {
        userConfigPath: `${USER_CONFIG_DIR}/wtc.yaml`,
        projectConfigPath: null,
        projectConfigSearchStart: `${PROJECT_ROOT}/packages/app`,
      },
    });
  });
});
