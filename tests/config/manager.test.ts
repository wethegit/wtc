import { describe, expect, test } from "bun:test";
import { loadConfig, saveConfig, saveSecrets, loadSecrets } from "../../src/config/manager.ts";

describe("config manager", () => {
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
    // Reset config by saving default
    const config = await loadConfig();
    config.encrypted = { salt: "", iv: "", authTag: "", data: "" };
    await saveConfig(config);

    const result = await loadSecrets("any-password");
    expect(result).toBeNull();
  });
});
