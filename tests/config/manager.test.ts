import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { loadConfig, saveConfig, saveSecrets, loadSecrets } from "../../src/config/manager.ts";

const CONFIG_DIR = `${Bun.env.TMPDIR ?? "/tmp"}/wtc-config-tests-${process.pid}`;

describe("config manager", () => {
  beforeEach(async () => {
    process.env.WTC_CONFIG_DIR = CONFIG_DIR;
    process.env.WTC_SKIP_CONFIG_PROMPTS = "1";
    await Bun.$`rm -rf ${CONFIG_DIR}`.quiet();
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${CONFIG_DIR}`.quiet();
    delete process.env.WTC_CONFIG_DIR;
    delete process.env.WTC_SKIP_CONFIG_PROMPTS;
  });

  test("default config is valid", async () => {
    const config = await loadConfig();

    expect(config.version).toBe(1);
    expect(config.plain.aws.profile).toBe("default");
    expect(config.plain.github.org).toBe("");
    expect(config.plain.teamwork.domain).toBe("");
  });

  test("save and load secrets round-trip", async () => {
    const password = "test-pw";
    const secrets = {
      github: { token: "ghp_test" },
      teamwork: { apiKey: "tw_test" },
    };

    await saveSecrets(secrets, password);
    const loaded = await loadSecrets(password);

    expect(loaded).toEqual(secrets);
  });

  test("loadSecrets returns null when no secrets stored", async () => {
    const result = await loadSecrets("any-password");
    expect(result).toBeNull();
  });

  test("saveConfig persists plain config", async () => {
    const config = await loadConfig();
    config.plain.github.org = "wethegit";
    await saveConfig(config);

    const loaded = await loadConfig();
    expect(loaded.plain.github.org).toBe("wethegit");
  });
});
