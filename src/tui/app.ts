import { Box, createCliRenderer, isRenderable, t } from "@opentui/core";
import { checkForUpdate } from "../utils/update-check.ts";
import { APP_VERSION } from "../version.ts";
import { createDashboard } from "./pages/dashboard.ts";
import { createModal } from "./components/modal.ts";

const REPO = "wethegit/wtc";

export async function launchDashboard(version = APP_VERSION): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  renderer.root.add(Box({ flexDirection: "column", flexGrow: 1 }, createDashboard(version)));

  const nav = renderer.root.findDescendantById("dashboard-nav");
  if (nav && isRenderable(nav)) {
    nav.focus();
  }

  const updateModal = createModal(renderer, {
    id: "update-modal",
    title: "Update Available",
  });

  checkForUpdate(version).then((info) => {
    if (info.updateAvailable) {
      updateModal.setBody(
        t`  v${version} \u2192 ${info.latestVersion}
    curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash
`,
      );
      updateModal.show();
    }
  });

  await new Promise<void>((resolve) => {
    renderer.on("destroy", () => resolve());
  });
}
