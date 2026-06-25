import { describe, expect, test } from "bun:test";

import { ProjectConfigSchema, UserConfigSchema } from "../../../src/api/config/schema.ts";

describe("config schemas", () => {
  test("rejects unsupported config versions", () => {
    expect(() => UserConfigSchema.parse({ version: 2 })).toThrow();
    expect(() => ProjectConfigSchema.parse({ version: 2 })).toThrow();
  });
});
