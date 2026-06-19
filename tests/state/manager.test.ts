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

    expect(state.lastRoute.page).toBe("home");
    expect(state.lastRoute.tab).toBe("index");
    expect(state.lastUpdated).toBeTruthy();
  });

  test("round-trip returns matching entry", async () => {
    const dir = "/home/user/project";
    await saveTuiState(dir, { lastRoute: { page: "settings", tab: "index" } });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute.page).toBe("settings");
    expect(loaded.lastRoute.tab).toBe("index");
    expect(loaded.lastUpdated).toBeTruthy();
  });

  test("round-trip preserves Teamwork tab", async () => {
    const dir = "/home/user/project";
    await saveTuiState(dir, { lastRoute: { page: "teamwork", tab: "my-work" } });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute.page).toBe("teamwork");
    expect(loaded.lastRoute.tab).toBe("my-work");
  });

  test("multiple directories produce independent entries", async () => {
    await saveTuiState("/project/a", { lastRoute: { page: "github", tab: "index" } });
    await saveTuiState("/project/b", { lastRoute: { page: "teamwork", tab: "my-work" } });

    expect((await loadTuiState("/project/a")).lastRoute.page).toBe("github");
    expect((await loadTuiState("/project/b")).lastRoute.page).toBe("teamwork");
  });

  test("corrupted file returns defaults", async () => {
    const cachedDir = getCacheDir();
    await Bun.write(`${cachedDir}/tui-state.json`, "this is not json");

    const state = await loadTuiState("/some/dir");
    expect(state.lastRoute.page).toBe("home");
  });

  test("save merges existing entry instead of replacing", async () => {
    const dir = "/project";
    await saveTuiState(dir, { lastRoute: { page: "github", tab: "index" } });
    // Simulate a second write with only a partial update
    await saveTuiState(dir, { lastUpdated: "lolz" });

    const loaded = await loadTuiState(dir);
    expect(loaded.lastRoute.page).toBe("github");
  });

  test("clearCache removes cache directory", async () => {
    await saveTuiState("/some/dir", { lastRoute: { page: "settings", tab: "index" } });
    expect((await loadTuiState("/some/dir")).lastRoute.page).toBe("settings");

    await clearCache();

    // After clearing, loading any dir should return defaults
    const state = await loadTuiState("/some/dir");
    expect(state.lastRoute.page).toBe("home");
  });
});
