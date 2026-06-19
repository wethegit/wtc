import { describe, expect, test } from "bun:test";

import { TuiStateEntrySchema, TuiStateFileSchema } from "../../src/state/schema.ts";

describe("TuiStateEntrySchema", () => {
  test("accepts extra unknown fields for forward compat", () => {
    expect(
      TuiStateEntrySchema.parse({
        lastRoute: { page: "github", tab: "index" },
        lastUpdated: "2026-06-15T10:00:00Z",
        scrollY: 42,
      }),
    ).toEqual({
      lastRoute: { page: "github", tab: "index" },
      lastUpdated: "2026-06-15T10:00:00Z",
    });
  });
});

describe("TuiStateFileSchema", () => {
  test("rejects unsupported version", () => {
    expect(() =>
      TuiStateFileSchema.parse({
        version: 2,
        entries: {},
      }),
    ).toThrow();
  });
});
