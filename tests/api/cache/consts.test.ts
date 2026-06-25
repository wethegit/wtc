import { afterEach, describe, expect, test } from "bun:test";

import { getCacheDir } from "../../../src/api/cache/consts.ts";

const TEST_CACHE = `/tmp/wtc-state-consts-tests-${process.pid}`;

describe("getCacheDir", () => {
  afterEach(() => {
    delete process.env.WTC_CACHE_DIR;
  });

  test("default path uses homedir", () => {
    const path = getCacheDir();

    expect(path).toEndWith("/.config/wtc/cache");
  });

  test("WTC_CACHE_DIR overrides default", () => {
    process.env.WTC_CACHE_DIR = TEST_CACHE;

    expect(getCacheDir()).toBe(TEST_CACHE);
  });
});
