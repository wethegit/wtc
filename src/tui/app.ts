import { createCliRenderer } from "@opentui/core";
import { createDashboard } from "./pages/dashboard.ts";

export async function launchDashboard(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  renderer.root.add(createDashboard());

  // Block until renderer exits
  await new Promise<void>(() => {});
}
