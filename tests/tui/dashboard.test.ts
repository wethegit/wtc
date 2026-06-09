import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createDashboard } from "../../src/tui/pages/dashboard.ts";

describe("dashboard", () => {
  test("renders WTC ascii art", async () => {
    const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
      width: 80,
      height: 24,
    });

    renderer.root.add(createDashboard("0.1.0"));
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

    renderer.root.add(createDashboard("0.1.0"));
    await renderOnce();

    const frame = captureCharFrame();

    expect(frame).toContain("What will you build?");

    renderer.destroy();
  });

  test("renders MVP navigation and footer", async () => {
    const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
      width: 80,
      height: 24,
    });

    renderer.root.add(createDashboard("0.1.0"));
    await renderOnce();

    const frame = captureCharFrame();

    expect(frame).toContain("GitHub (coming soon)");
    expect(frame).toContain("Amplify (coming soon)");
    expect(frame).toContain("Teamwork (coming soon)");
    expect(frame).toContain("Settings (coming soon)");
    expect(frame).toContain("v0.1.0 | Press Ctrl+C to exit");

    renderer.destroy();
  });

  test("dashboard navigation responds to arrow keys", async () => {
    const { renderer, mockInput, renderOnce, captureCharFrame } = await createTestRenderer({
      width: 80,
      height: 24,
    });

    renderer.root.add(createDashboard("0.1.0"));
    const nav = renderer.root.findDescendantById("dashboard-nav");
    if (nav && "focus" in nav && typeof nav.focus === "function") {
      nav.focus();
    }

    mockInput.pressArrow("down");
    await renderOnce();

    const frame = captureCharFrame();
    expect(frame).toContain("Amplify (coming soon)");

    renderer.destroy();
  });
});
