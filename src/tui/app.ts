import { APP_VERSION } from "../version.ts";
import { launchSolidApp } from "./app.tsx";

export async function launchDashboard(version = APP_VERSION): Promise<void> {
  await launchSolidApp(version);
}
