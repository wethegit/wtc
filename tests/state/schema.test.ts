import { describe, expect, test } from "bun:test";

import { TuiStateEntrySchema, TuiStateFileSchema } from "../../src/state/schema.ts";

describe("TuiStateEntrySchema", () => {
  test("parses a valid entry", () => {
    expect(
      TuiStateEntrySchema.parse({ lastRoute: "settings", lastUpdated: "2026-06-15T10:00:00Z" }),
    ).toEqual({
      lastRoute: "settings",
      lastUpdated: "2026-06-15T10:00:00Z",
    });
  });

  test("defaults lastRoute to home when missing", () => {
    expect(TuiStateEntrySchema.parse({ lastUpdated: "2026-06-15T10:00:00Z" })).toEqual({
      lastRoute: "home",
      lastUpdated: "2026-06-15T10:00:00Z",
    });
  });

  test("accepts extra unknown fields for forward compat", () => {
    expect(
      TuiStateEntrySchema.parse({
        lastRoute: "github",
        lastUpdated: "2026-06-15T10:00:00Z",
        scrollY: 42,
      }),
    ).toEqual({
      lastRoute: "github",
      lastUpdated: "2026-06-15T10:00:00Z",
    });
  });

  test("rejects invalid lastRoute value", () => {
    expect(() =>
      TuiStateEntrySchema.parse({ lastRoute: "invalid", lastUpdated: "2026-06-15T10:00:00Z" }),
    ).toThrow();
  });
});

describe("TuiStateFileSchema", () => {
  test("parses a valid state file with one entry", () => {
    expect(
      TuiStateFileSchema.parse({
        version: 1,
        entries: {
          "/home/user/project": {
            lastRoute: "settings",
            lastUpdated: "2026-06-15T10:00:00Z",
          },
        },
      }),
    ).toEqual({
      version: 1,
      entries: {
        "/home/user/project": {
          lastRoute: "settings",
          lastUpdated: "2026-06-15T10:00:00Z",
        },
      },
    });
  });

  test("parses a valid state file with multiple entries", () => {
    expect(
      TuiStateFileSchema.parse({
        version: 1,
        entries: {
          "/home/user/a": { lastRoute: "github", lastUpdated: "2026-06-15T10:00:00Z" },
          "/home/user/b": { lastRoute: "settings", lastUpdated: "2026-06-15T11:00:00Z" },
        },
      }),
    ).toEqual({
      version: 1,
      entries: {
        "/home/user/a": { lastRoute: "github", lastUpdated: "2026-06-15T10:00:00Z" },
        "/home/user/b": { lastRoute: "settings", lastUpdated: "2026-06-15T11:00:00Z" },
      },
    });
  });

  test("rejects unsupported version", () => {
    expect(() =>
      TuiStateFileSchema.parse({
        version: 2,
        entries: {},
      }),
    ).toThrow();
  });

  test("rejects non-record entries", () => {
    expect(() =>
      TuiStateFileSchema.parse({
        version: 1,
        entries: "not-an-object",
      }),
    ).toThrow();
  });
});
