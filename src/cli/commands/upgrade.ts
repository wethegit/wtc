import { checkForUpdate } from "../../utils/update-check.ts";
import { APP_VERSION } from "../../version.ts";

const REPO = "wethegit/homebrew-wtc";

export async function upgrade(_args: { check: boolean }): Promise<void> {
  const currentVersion = APP_VERSION;
  const info = await checkForUpdate(currentVersion);

  if (!info.updateAvailable) {
    console.log(`You're up to date (v${currentVersion}).`);
    return;
  }

  console.log(`Update available: v${currentVersion} \u2192 ${info.latestVersion}`);
  console.log(`  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`);
}
