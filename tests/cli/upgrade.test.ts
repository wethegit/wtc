import { describe, expect, test } from "bun:test";
import {
  getManagedInstallError,
  getManagedInstallInfoFromPath,
} from "../../src/cli/commands/upgrade.ts";

describe("upgrade install method detection", () => {
  test("detects macOS Homebrew paths", () => {
    const info = getManagedInstallInfoFromPath("/opt/homebrew/Cellar/wtc/0.1.0/bin/wtc");

    expect(info).toEqual({ manager: "Homebrew", command: "brew upgrade wtc" });
  });

  test("detects Linux Homebrew paths", () => {
    const info = getManagedInstallInfoFromPath(
      "/home/linuxbrew/.linuxbrew/Cellar/wtc/0.1.0/bin/wtc",
    );

    expect(info).toEqual({ manager: "Homebrew", command: "brew upgrade wtc" });
  });

  test("allows self-managed install paths", () => {
    const info = getManagedInstallInfoFromPath("/usr/local/bin/wtc");

    expect(info).toBeNull();
  });

  test("formats managed install errors", () => {
    const message = getManagedInstallError({ manager: "pacman/AUR", command: "yay -Syu wtc" });

    expect(message).toContain("pacman/AUR");
    expect(message).toContain("Self-upgrade is disabled");
    expect(message).toContain("yay -Syu wtc");
  });
});
