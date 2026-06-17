import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { rm } from "node:fs/promises";
import { checkForUpdate } from "../../src/utils/update-check.ts";

const CACHE_DIR = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-update-tests-${process.pid}`;
const CACHE_PATH = `${CACHE_DIR}/update-check.json`;

async function writeUpdateCache(latestVersion: string): Promise<void> {
  await Bun.write(CACHE_PATH, JSON.stringify({ latestVersion, checkedAt: Date.now() }));
}

describe("update-check", () => {
  beforeEach(async () => {
    process.env.WTC_CACHE_DIR = CACHE_DIR;
    await rm(CACHE_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(CACHE_DIR, { recursive: true, force: true });
    delete process.env.WTC_CACHE_DIR;
  });

  test("returns no update when same version", async () => {
    await writeUpdateCache("v0.1.0");

    const info = await checkForUpdate("v0.1.0");
    expect(info.currentVersion).toBe("v0.1.0");
    expect(info.latestVersion).toBe("v0.1.0");
    expect(info.updateAvailable).toBe(false);
  });

  test("treats v-prefixed and bare versions as equal", async () => {
    await writeUpdateCache("v0.1.0");

    const info = await checkForUpdate("0.1.0");
    expect(info.updateAvailable).toBe(false);
  });

  test("does not report older cached versions as updates", async () => {
    await writeUpdateCache("v0.1.0");

    const info = await checkForUpdate("v1.0.0");
    expect(info.updateAvailable).toBe(false);
  });

  test("returns update available when newer version cached", async () => {
    await writeUpdateCache("v1.0.0");

    const info = await checkForUpdate("v0.1.0");
    expect(info.currentVersion).toBe("v0.1.0");
    expect(info.latestVersion).toBe("v1.0.0");
    expect(info.updateAvailable).toBe(true);
  });
});
