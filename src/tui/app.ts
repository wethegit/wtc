import { createCliRenderer, isRenderable } from "@opentui/core";
import { createDashboard } from "./pages/dashboard.ts";
import { APP_VERSION } from "../version.ts";

export async function launchDashboard(version = APP_VERSION): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  renderer.root.add(createDashboard(version));

  const nav = renderer.root.findDescendantById("dashboard-nav");
  if (nav && isRenderable(nav)) {
    nav.focus();
  }

  // Block until renderer exits
  await new Promise<void>(() => {});
}
