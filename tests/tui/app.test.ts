import { describe, expect, mock, test } from "bun:test";

type NotificationNode = {
  content: string;
};

type BoxNode = {
  children: unknown[];
};

function isBoxNode(value: unknown): value is BoxNode {
  return typeof value === "object" && value !== null && "children" in value;
}

function isNotificationNode(value: unknown): value is NotificationNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    typeof (value as { content: unknown }).content === "string"
  );
}

describe("launchDashboard", () => {
  test("renders update banner when update check resolves", async () => {
    const state: { notif: NotificationNode | null } = { notif: null };

    mock.module("@opentui/core", () => ({
      Box: (_props: unknown, ...children: unknown[]) => ({ children }),
      Text: ({ content }: { content: string }) => ({ content }),
      createCliRenderer: async () => ({
        root: {
          add(node: unknown): void {
            if (!isBoxNode(node)) {
              return;
            }

            const [firstChild] = node.children;
            if (isNotificationNode(firstChild)) {
              state.notif = firstChild;
            }
          },
          findDescendantById: (_id: string) => ({ focus: () => {} }),
        },
      }),
      isRenderable: () => true,
      t: (strings: TemplateStringsArray, ...values: string[]) =>
        strings.reduce((result, segment, index) => result + segment + (values[index] ?? ""), ""),
    }));

    mock.module("../../src/utils/update-check.ts", () => ({
      checkForUpdate: async () => ({
        updateAvailable: true,
        currentVersion: "v0.1.0",
        latestVersion: "v9.9.9",
      }),
    }));

    mock.module("../../src/tui/pages/dashboard.ts", () => ({
      createDashboard: (_version: string) => ({ id: "dashboard" }),
    }));

    const { launchDashboard } = await import("../../src/tui/app.ts");

    void launchDashboard("0.1.0");

    for (let attempt = 0; attempt < 50 && !state.notif; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    if (!state.notif) {
      throw new Error("Expected update notification to render");
    }

    expect(state.notif.content).toContain("Update available: v0.1.0 → v9.9.9");
    expect(state.notif.content).toContain("install.sh | bash");

    mock.restore();
  });
});
