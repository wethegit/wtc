import { describe, expect, test } from "bun:test";
import { filterCommands, type CommandEntry } from "../../src/tui/components/command-palette.tsx";

function command(id: string, title: string, description?: string): CommandEntry {
  return {
    id,
    title,
    description,
    onSelect() {},
  };
}

describe("filterCommands", () => {
  const commands = [
    command("github.open", "Open GitHub", "Repository workflows"),
    command("settings.open", "Open Settings", "Configuration and setup"),
  ];

  test("returns all commands for empty query", () => {
    expect(filterCommands(commands, "").map((entry) => entry.id)).toEqual([
      "github.open",
      "settings.open",
    ]);
  });

  test("filters by title", () => {
    expect(filterCommands(commands, "git").map((entry) => entry.id)).toEqual(["github.open"]);
  });

  test("filters by description", () => {
    expect(filterCommands(commands, "config").map((entry) => entry.id)).toEqual(["settings.open"]);
  });
});
