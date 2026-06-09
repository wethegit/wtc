import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createDashboard } from "../../src/tui/pages/dashboard.ts";

describe("dashboard", () => {
  test("renders WTC ascii art", async () => {
    const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
      width: 80,
      height: 24,
    });

    renderer.root.add(createDashboard());
    await renderOnce();

    const frame = captureCharFrame();

    expect(frame).toContain("█");
    expect(frame).toContain("▀█▀");

    renderer.destroy();
  });

  test("renders subtitle text", async () => {
    const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
      width: 80,
      height: 24,
    });

    renderer.root.add(createDashboard());
    await renderOnce();

    const frame = captureCharFrame();

    expect(frame).toContain("What will you build?");

    renderer.destroy();
  });
});
