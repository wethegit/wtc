import { APP_VERSION } from "../../config/consts.ts";
import { checkForUpdate } from "../../utils/update-check.ts";

const REPO = "wethegit/wtc";

export async function upgrade(_args: { check: boolean }): Promise<void> {
  const info = await checkForUpdate();

  if (!info.updateAvailable) {
    console.log(`You're up to date (v${APP_VERSION}).`);
    return;
  }

  console.log(`Update available: v${APP_VERSION} \u2192 ${info.latestVersion}`);
  console.log(`  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`);
}
