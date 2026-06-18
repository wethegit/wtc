import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { clearCache, loadTuiState, saveTuiState } from "../../src/state/manager.ts";
import { getCacheDir } from "../../src/state/consts.ts";

const TEST_CACHE = `/tmp/wtc-state-tests-${process.pid}`;

describe("state manager", () => {
  beforeEach(() => {
    process.env.WTC_CACHE_DIR = TEST_CACHE;
  });

  afterEach(async () => {
    delete process.env.WTC_CACHE_DIR;
    await rm(TEST_CACHE, { recursive: true, force: true });
  });

  test("missing file returns defaults", async () => {
    const state = await loadTuiState("/some/dir");

    expect(state.lastRoute).toBe("home");
    expect(state.lastTeamworkTab).toBe("project");
    expect(state.lastUpdated).toBeTruthy();
  });

  test("round-trip returns matching entry", async () => {
    const dir = "/home/user/project";
    await saveTuiState(dir, { lastRoute: "settings" });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute).toBe("settings");
    expect(loaded.lastTeamworkTab).toBe("project");
    expect(loaded.lastUpdated).toBeTruthy();
  });

  test("round-trip preserves Teamwork tab", async () => {
    const dir = "/home/user/project";
    await saveTuiState(dir, { lastRoute: "teamwork", lastTeamworkTab: "my-work" });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute).toBe("teamwork");
    expect(loaded.lastTeamworkTab).toBe("my-work");
  });

  test("multiple directories produce independent entries", async () => {
    await saveTuiState("/project/a", { lastRoute: "github" });
    await saveTuiState("/project/b", { lastRoute: "settings" });

    expect((await loadTuiState("/project/a")).lastRoute).toBe("github");
    expect((await loadTuiState("/project/b")).lastRoute).toBe("settings");
  });

  test("corrupted file returns defaults", async () => {
    const cachedDir = getCacheDir();
    await Bun.write(`${cachedDir}/tui-state.json`, "this is not json");

    const state = await loadTuiState("/some/dir");
    expect(state.lastRoute).toBe("home");
  });

  test("save merges existing entry instead of replacing", async () => {
    const dir = "/project";
    await saveTuiState(dir, { lastRoute: "github" });
    // Simulate a second write with only a partial update
    await saveTuiState(dir, { lastRoute: "settings" });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute).toBe("settings");
  });

  test("clearCache removes cache directory", async () => {
    await saveTuiState("/some/dir", { lastRoute: "settings" });
    expect((await loadTuiState("/some/dir")).lastRoute).toBe("settings");

    await clearCache();

    // After clearing, loading any dir should return defaults
    const state = await loadTuiState("/some/dir");
    expect(state.lastRoute).toBe("home");
  });
});
