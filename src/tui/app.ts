import { Box, Text, createCliRenderer, isRenderable, t } from "@opentui/core";
import { checkForUpdate } from "../utils/update-check.ts";
import { APP_VERSION } from "../version.ts";
import { createDashboard } from "./pages/dashboard.ts";

const REPO = "wethegit/homebrew-wtc";

export async function launchDashboard(version = APP_VERSION): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  const notif = Text({ content: "" });

  renderer.root.add(Box({ flexDirection: "column", flexGrow: 1 }, notif, createDashboard(version)));

  const nav = renderer.root.findDescendantById("dashboard-nav");
  if (nav && isRenderable(nav)) {
    nav.focus();
  }

  checkForUpdate(version).then((info) => {
    if (info.updateAvailable) {
      notif.content = t`  Update available: v${version} \u2192 ${info.latestVersion}
    curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash
`;
    }
  });

  await new Promise<void>(() => {});
}
