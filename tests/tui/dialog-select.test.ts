import { describe, expect, test } from "bun:test";
import {
  filterDialogSelectOptions,
  type DialogSelectOption,
} from "../../src/tui/components/dialog-select.tsx";

function option(value: string, title: string, description?: string): DialogSelectOption<string> {
  return { value, title, description };
}

describe("filterDialogSelectOptions", () => {
  const options = [
    option("github.open", "Open GitHub", "Repository workflows"),
    option("settings.open", "Open Settings", "Configuration and setup"),
  ];

  test("returns all options for empty query", () => {
    expect(filterDialogSelectOptions(options, "").map((entry) => entry.value)).toEqual([
      "github.open",
      "settings.open",
    ]);
  });

  test("filters by title", () => {
    expect(filterDialogSelectOptions(options, "git").map((entry) => entry.value)).toEqual([
      "github.open",
    ]);
  });

  test("filters by description", () => {
    expect(filterDialogSelectOptions(options, "config").map((entry) => entry.value)).toEqual([
      "settings.open",
    ]);
  });
});
