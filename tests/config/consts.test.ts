import { afterEach, describe, expect, test } from "bun:test";

import { getUserConfigDir } from "../../src/config/consts.ts";

const TEST_DIR = `/tmp/wtc-config-consts-tests-${process.pid}`;

describe("getUserConfigDir", () => {
  afterEach(() => {
    delete process.env.WTC_CONFIG_DIR;
  });

  test("default path uses homedir", () => {
    const path = getUserConfigDir();

    expect(path).toEndWith("/.config/wtc");
  });

  test("WTC_CONFIG_DIR overrides default", () => {
    process.env.WTC_CONFIG_DIR = TEST_DIR;

    expect(getUserConfigDir()).toBe(TEST_DIR);
  });
});
